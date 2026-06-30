import crypto from "crypto";
import http from "http";
import https from "https";
import ServiceOrder from "../models/ServiceOrder";
import PaymentAudit from "../models/PaymentAudit";
import { redact } from "../utils/redact";

type JsonRecord = Record<string, unknown>;

interface ProviderToken {
  accessToken: string;
  expiresAt: number;
  cacheKey: string;
}

interface CallbackTransaction {
  bankAccount: string;
  amount: number;
  transType: string;
  content: string;
  transactionId: string;
  transactionTime: number;
  referenceNumber: string;
  orderId: string;
  terminalCode: string;
}

export class VietQrCallbackError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

let cachedProviderToken: ProviderToken | null = null;

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw Object.assign(new Error(`Missing ${name}`), { status: 503 });
  }
  return value;
}

function providerConfig() {
  const environment = String(process.env.VIETQR_ENV || "sandbox").trim().toLowerCase();
  const defaultBaseUrl = environment === "production"
    ? "https://api.vietqr.org"
    : "https://dev.vietqr.org";
  const baseUrl = String(process.env.VIETQR_API_BASE_URL || defaultBaseUrl).replace(/\/+$/, "");
  const parsedBaseUrl = new URL(baseUrl);
  if (
    parsedBaseUrl.protocol !== "https:" &&
    !(process.env.NODE_ENV === "test" && parsedBaseUrl.protocol === "http:")
  ) {
    throw Object.assign(new Error("VIETQR_API_BASE_URL must use HTTPS"), { status: 503 });
  }

  return {
    baseUrl,
    username: requiredEnv("VIETQR_API_USERNAME"),
    password: requiredEnv("VIETQR_API_PASSWORD"),
    bankCode: requiredEnv("VIETQR_BANK_CODE").toUpperCase(),
    bankAccount: requiredEnv("VIETQR_BANK_ACCOUNT"),
    bankAccountName: normalizeVietnamese(requiredEnv("VIETQR_BANK_ACCOUNT_NAME")),
    terminalCode: String(process.env.VIETQR_TERMINAL_CODE || "").trim(),
    returnUrl: String(process.env.VIETQR_RETURN_URL || "").trim(),
  };
}

function requestJson(
  urlString: string,
  options: { method: string; headers?: Record<string, string>; body?: JsonRecord }
): Promise<{ status: number; data: JsonRecord }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = options.body ? JSON.stringify(options.body) : "";
    const transport = url.protocol === "http:" ? http : https;
    const request = transport.request(
      url,
      {
        method: options.method,
        headers: {
          Accept: "application/json",
          ...(body ? {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body).toString(),
          } : {}),
          ...options.headers,
        },
        timeout: 10_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            request.destroy(new Error("VietQR response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let data: JsonRecord = {};
          try {
            data = raw ? JSON.parse(raw) as JsonRecord : {};
          } catch {
            reject(Object.assign(new Error("VietQR returned invalid JSON"), { status: 502 }));
            return;
          }
          resolve({ status: response.statusCode || 500, data });
        });
      }
    );

    request.on("timeout", () => request.destroy(new Error("VietQR request timed out")));
    request.on("error", (error) => {
      reject(Object.assign(new Error(error.message), { status: 502 }));
    });
    if (body) request.write(body);
    request.end();
  });
}

async function getProviderToken(config: ReturnType<typeof providerConfig>): Promise<string> {
  const cacheKey = `${config.baseUrl}:${config.username}`;
  if (
    cachedProviderToken &&
    cachedProviderToken.cacheKey === cacheKey &&
    Date.now() < cachedProviderToken.expiresAt - 15_000
  ) {
    return cachedProviderToken.accessToken;
  }

  const credentials = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const response = await requestJson(`${config.baseUrl}/vqr/api/token_generate`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });
  const accessToken = String(response.data.access_token || "");
  const expiresIn = Number(response.data.expires_in || 300);

  if (response.status < 200 || response.status >= 300 || !accessToken) {
    throw Object.assign(
      new Error(`VietQR token request failed: ${String(response.data.message || response.status)}`),
      { status: 502 }
    );
  }

  cachedProviderToken = {
    accessToken,
    expiresAt: Date.now() + Math.max(1, expiresIn) * 1000,
    cacheKey,
  };
  return accessToken;
}

function createPaymentOrderId(orderNumber: string): string {
  // orderNumber dạng ORD-001 → ORD001 (≤ 13 ký tự, A-Z0-9).
  // Thêm 4 hex random để đảm bảo unique giữa các lần regenerate.
  const base = orderNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  if (!base) {
    throw Object.assign(new Error("Cannot create VietQR order ID"), { status: 500 });
  }
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base}${suffix}`.slice(0, 13);
}

function parseCallback(body: JsonRecord): CallbackTransaction {
  const bankAccount = String(body.bankaccount ?? body.bankAccount ?? "").trim();
  const amount = Number(body.amount);
  const transType = String(body.transType ?? "").trim().toUpperCase();
  const content = String(body.content ?? "").trim();
  const transactionId = String(body.transactionid ?? body.transactionId ?? "").trim();
  const transactionTime = Number(body.transactiontime ?? body.transactionTime);
  const referenceNumber = String(body.referencenumber ?? body.referenceNumber ?? "").trim();
  const orderId = String(body.orderId ?? "").trim().toUpperCase();
  const terminalCode = String(body.terminalCode ?? "").trim();

  if (
    !bankAccount ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !transType ||
    !content ||
    !transactionId ||
    !Number.isSafeInteger(transactionTime) ||
    transactionTime < 1_000_000_000_000 ||
    !referenceNumber ||
    !orderId
  ) {
    throw new VietQrCallbackError("INVALID_PAYLOAD", "Missing or invalid transaction fields");
  }

  return {
    bankAccount,
    amount,
    transType,
    content,
    transactionId,
    transactionTime,
    referenceNumber,
    orderId,
    terminalCode,
  };
}

function normalizeAccount(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeVietnamese(value: string): string {
  return value
    .replace(/[đĐ]/g, (character) => character === "đ" ? "d" : "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeContent(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function paymentSnapshot(order: { paymentMethod?: string | null; paymentStatus: string; paymentNote?: string; paymentQrCode?: string; paymentQrLink?: string; paymentContent?: string; paymentBankCode?: string; paymentBankAccount?: string; paymentBankAccountName?: string; totalAmount: number; paidAmount?: number; paidAt?: Date | null }) {
  return {
    paymentMethod: order.paymentMethod || null,
    paymentStatus: order.paymentStatus,
    paymentNote: order.paymentNote || "",
    amount: order.totalAmount,
    paidAmount: order.paidAmount || 0,
    paidAt: order.paidAt || null,
    qrCode: order.paymentQrCode || "",
    qrLink: order.paymentQrLink || "",
    content: order.paymentContent || "",
    bankCode: order.paymentBankCode || "",
    bankAccount: order.paymentBankAccount || "",
    bankAccountName: order.paymentBankAccountName || "",
  };
}

async function findOrderByIdOrNumber(idOrNumber: string) {
  const value = String(idOrNumber || "").trim();
  if (!value) throw Object.assign(new Error("Missing order id"), { status: 400 });

  const escaped = value.slice(0, 32).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const order = await ServiceOrder.findOne({
    $or: [
      { id: value },
      { orderNumber: { $regex: new RegExp(`^${escaped}$`, "i") } },
    ],
  }).select("+paymentTransactionId +paymentReferenceNumber");
  if (!order) throw Object.assign(new Error("Not found"), { status: 404 });
  return order;
}

export async function createPaymentQr(idOrNumber: string) {
  const order = await findOrderByIdOrNumber(idOrNumber);

  if (order.status === "cancelled") {
    throw Object.assign(new Error("Order is cancelled"), { status: 409 });
  }
  if (order.paymentStatus === "paid") {
    throw Object.assign(new Error("Order is already paid"), { status: 409 });
  }
  if (!Number.isSafeInteger(order.totalAmount) || order.totalAmount <= 0) {
    throw Object.assign(new Error("Order amount must be a positive VND integer"), { status: 400 });
  }

  // Idempotent: nếu đã có QR cho đơn (chưa paid, chưa cancelled) thì trả lại
  // QR đó — không tạo mới. VietQR/EMVCo không có khái niệm hết hạn nên QR cũ
  // vẫn quét được; gọi provider lần nữa chỉ tốn quota.
  if (order.paymentQrCode && order.paymentOrderId) {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      ...paymentSnapshot(order),
    };
  }

  const config = providerConfig();
  const paymentOrderId = createPaymentOrderId(order.orderNumber);
  const requestedContent = `GIAYCUNG ${paymentOrderId}`.slice(0, 23);
  const token = await getProviderToken(config);
  const payload: JsonRecord = {
    bankCode: config.bankCode,
    bankAccount: config.bankAccount,
    userBankName: config.bankAccountName,
    content: requestedContent,
    qrType: 0,
    amount: Math.round(order.totalAmount),
    orderId: paymentOrderId,
    transType: "C",
    additionalData: [],
  };
  if (config.terminalCode) payload.terminalCode = config.terminalCode;
  if (config.returnUrl) payload.urlLink = config.returnUrl;

  const response = await requestJson(`${config.baseUrl}/vqr/api/qr/generate-customer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: payload,
  });

  if (
    response.status < 200 ||
    response.status >= 300 ||
    response.data.status === "FAILED" ||
    !response.data.qrCode
  ) {
    throw Object.assign(
      new Error(`VietQR generate request failed: ${String(response.data.message || response.status)}`),
      { status: 502 }
    );
  }

  // Chọn vietqr làm phương thức nếu admin trước đó để cash/bank_transfer —
  // hành động tạo QR ngụ ý đang chuyển sang thanh toán qua VietQR.
  order.paymentMethod = "vietqr";
  order.paymentStatus = "pending";
  order.paymentOrderId = paymentOrderId;
  order.paymentContent = String(response.data.content || requestedContent);
  order.paymentQrCode = String(response.data.qrCode || "");
  order.paymentQrLink = String(response.data.qrLink || "");
  order.paymentProviderRef = String(
    response.data.transactionRefId || response.data.transactionId || ""
  );
  order.paymentBankCode = String(response.data.bankCode || config.bankCode);
  order.paymentBankAccount = String(response.data.bankAccount || config.bankAccount);
  order.paymentBankAccountName = String(response.data.userBankName || config.bankAccountName);
  await order.save();

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    ...paymentSnapshot(order),
  };
}

export async function getPaymentStatus(idOrNumber: string) {
  const order = await findOrderByIdOrNumber(idOrNumber);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    ...paymentSnapshot(order),
  };
}

async function recordAudit(
  code: string,
  body: JsonRecord,
  transaction: Partial<CallbackTransaction>,
  snapshot: JsonRecord = {}
): Promise<void> {
  try {
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(body || {}))
      .digest("hex");
    await PaymentAudit.create({
      code,
      orderId: transaction.orderId || "",
      paymentOrderId: transaction.orderId || "",
      transactionId: transaction.transactionId || "",
      referenceNumber: transaction.referenceNumber || "",
      actor: "vietqr-callback",
      payloadHash,
      snapshot: redact(snapshot),
    });
  } catch {
    // Audit must never break the callback response.
  }
}

export async function processTransaction(body: JsonRecord) {
  let transaction: CallbackTransaction;
  try {
    transaction = parseCallback(body);
  } catch (error) {
    if (error instanceof VietQrCallbackError) {
      await recordAudit(error.code, body, {}, { rawKeys: Object.keys(body || {}) });
    }
    throw error;
  }

  try {
    return await applyTransaction(transaction);
  } catch (error) {
    if (error instanceof VietQrCallbackError) {
      await recordAudit(error.code, body, transaction, { message: error.message });
    }
    throw error;
  }
}

async function applyTransaction(transaction: CallbackTransaction) {
  if (transaction.transType !== "C") {
    throw new VietQrCallbackError(
      "INVALID_TRANSACTION_TYPE",
      "Only credit transactions are accepted"
    );
  }

  const duplicate = await ServiceOrder.findOne({
    paymentTransactionId: transaction.transactionId,
  }).select("+paymentTransactionId").lean();
  if (duplicate) {
    if (
      duplicate.paymentOrderId === transaction.orderId &&
      duplicate.paymentStatus === "paid" &&
      duplicate.paidAmount === transaction.amount &&
      normalizeContent(duplicate.paymentContent || "") === normalizeContent(transaction.content) &&
      normalizeAccount(duplicate.paymentBankAccount || "") === normalizeAccount(transaction.bankAccount)
    ) {
      return { reftransactionid: transaction.transactionId };
    }
    throw new VietQrCallbackError(
      "DUPLICATE_TRANSACTION",
      "Transaction was already used for another order"
    );
  }

  const order = await ServiceOrder.findOne({ paymentOrderId: transaction.orderId });
  if (!order) {
    throw new VietQrCallbackError("ORDER_NOT_FOUND", "Order not found", 404);
  }
  if (order.status === "cancelled") {
    throw new VietQrCallbackError("ORDER_CANCELLED", "Order is cancelled", 409);
  }
  if (order.paymentStatus === "paid") {
    throw new VietQrCallbackError(
      "PAYMENT_ALREADY_COMPLETED",
      "Order was already paid with another transaction",
      409
    );
  }

  const expectedBankAccount = order.paymentBankAccount || requiredEnv("VIETQR_BANK_ACCOUNT");
  if (
    normalizeAccount(transaction.bankAccount) !== normalizeAccount(expectedBankAccount)
  ) {
    throw new VietQrCallbackError("BANK_ACCOUNT_MISMATCH", "Bank account does not match");
  }
  if (transaction.amount !== order.totalAmount) {
    throw new VietQrCallbackError("AMOUNT_MISMATCH", "Transaction amount does not match order");
  }
  if (
    order.paymentContent &&
    normalizeContent(transaction.content) !== normalizeContent(order.paymentContent)
  ) {
    throw new VietQrCallbackError("CONTENT_MISMATCH", "Transaction content does not match order");
  }

  const paidAt = new Date(transaction.transactionTime);
  if (Number.isNaN(paidAt.getTime())) {
    throw new VietQrCallbackError("INVALID_PAYLOAD", "Invalid transaction time");
  }

  let updated;
  try {
    updated = await ServiceOrder.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: "paid" } },
      {
        $set: {
          paymentStatus: "paid",
          paymentTransactionId: transaction.transactionId,
          paymentReferenceNumber: transaction.referenceNumber,
          paidAmount: transaction.amount,
          paidAt,
          paymentRaw: transaction,
        },
      },
      { new: true }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new VietQrCallbackError(
        "DUPLICATE_TRANSACTION",
        "Transaction was already processed",
        409
      );
    }
    throw error;
  }

  if (!updated) {
    const latest = await ServiceOrder.findById(order._id).select("+paymentTransactionId").lean();
    if (
      latest?.paymentStatus === "paid" &&
      latest.paymentTransactionId === transaction.transactionId
    ) {
      return { reftransactionid: transaction.transactionId };
    }
    throw new VietQrCallbackError(
      "PAYMENT_ALREADY_COMPLETED",
      "Order payment changed while processing",
      409
    );
  }

  return { reftransactionid: transaction.transactionId };
}

// Admin xác nhận đã nhận tiền mặt. Hành động này tự đặt paymentMethod=cash,
// dù trước đó đơn chưa có method hay đã sinh QR vietqr (khách đổi ý trả tiền
// mặt khi đến cửa hàng). VietQR callback đến sau sẽ bị từ chối vì paymentStatus
// đã là paid — paymentOrderId được giữ lại để đối soát.
export async function confirmCashPayment(
  idOrNumber: string,
  body: Record<string, unknown>,
  adminEmail: string
) {
  const order = await findOrderByIdOrNumber(idOrNumber);

  if (order.status === "cancelled") {
    throw Object.assign(new Error("Cannot confirm payment on a cancelled order"), { status: 409 });
  }
  if (order.paymentStatus === "paid") {
    throw Object.assign(new Error("Order is already paid"), { status: 409 });
  }
  if (!Number.isSafeInteger(order.totalAmount) || order.totalAmount <= 0) {
    throw Object.assign(new Error("Order amount must be a positive VND integer"), { status: 400 });
  }

  const previousMethod = order.paymentMethod || null;
  const note = String(body.note || "").trim();
  const paidAmountInput = Number(body.paidAmount);
  const paidAmount = Number.isSafeInteger(paidAmountInput) && paidAmountInput > 0
    ? paidAmountInput
    : order.totalAmount;

  const updated = await ServiceOrder.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentMethod: "cash",
        paymentStatus: "paid",
        paidAmount,
        paidAt: new Date(),
        paymentNote: note || order.paymentNote || "",
      },
    },
    { new: true }
  );

  if (!updated) {
    throw Object.assign(new Error("Order payment state changed concurrently"), { status: 409 });
  }

  await PaymentAudit.create({
    code: "CASH_CONFIRM",
    orderId: order.id,
    paymentOrderId: order.paymentOrderId || "",
    actor: adminEmail || "admin",
    reason: note,
    snapshot: {
      previousMethod,
      previousStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      paidAmount,
    },
  });

  return {
    id: updated.id,
    orderNumber: updated.orderNumber,
    paymentMethod: updated.paymentMethod,
    paymentStatus: updated.paymentStatus,
    paidAmount: updated.paidAmount,
    paidAt: updated.paidAt,
  };
}

export async function manualMarkPaid(
  idOrNumber: string,
  body: Record<string, unknown>,
  adminEmail: string
) {
  const reason = String(body.reason || "").trim();
  const transactionRef = String(body.transactionRef || "").trim();
  const paidAmountInput = Number(body.paidAmount);
  if (reason.length < 5) {
    throw Object.assign(new Error("Reason is required (min 5 chars)"), { status: 400 });
  }
  if (!transactionRef) {
    throw Object.assign(new Error("transactionRef is required"), { status: 400 });
  }

  const order = await findOrderByIdOrNumber(idOrNumber);
  if (order.status === "cancelled") {
    throw Object.assign(new Error("Cannot mark a cancelled order as paid"), { status: 409 });
  }
  if (order.paymentStatus === "paid") {
    throw Object.assign(new Error("Order is already paid"), { status: 409 });
  }

  const paidAmount = Number.isSafeInteger(paidAmountInput) && paidAmountInput > 0
    ? paidAmountInput
    : order.totalAmount;

  const updated = await ServiceOrder.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        paidAmount,
        paidAt: new Date(),
        paymentReferenceNumber: transactionRef,
      },
    },
    { new: true }
  );

  if (!updated) {
    throw Object.assign(new Error("Order payment state changed concurrently"), { status: 409 });
  }

  await PaymentAudit.create({
    code: "MANUAL_MARK_PAID",
    orderId: order.id,
    paymentOrderId: order.paymentOrderId || "",
    transactionId: transactionRef,
    actor: adminEmail || "admin",
    reason,
    snapshot: {
      previousStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      paidAmount,
    },
  });

  return {
    id: updated.id,
    orderNumber: updated.orderNumber,
    paymentStatus: updated.paymentStatus,
    paidAmount: updated.paidAmount,
    paidAt: updated.paidAt,
  };
}

export function resetVietQrTokenCache(): void {
  cachedProviderToken = null;
}
