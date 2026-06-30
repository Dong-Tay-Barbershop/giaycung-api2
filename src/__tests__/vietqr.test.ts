import http from "http";
import { AddressInfo } from "net";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import ServiceOrder from "../models/ServiceOrder";
import { resetVietQrTokenCache } from "../services/vietqr.service";

let mongod: MongoMemoryServer;
let providerServer: http.Server;
let providerTokenCalls = 0;
let providerGenerateCalls = 0;
let lastGenerateBody: Record<string, unknown> = {};

const adminToken = "test-admin-secret";

function callbackBasicAuth() {
  return `Basic ${Buffer.from("giaycung_callback:callback_password").toString("base64")}`;
}

async function getCallbackToken() {
  const response = await request(app)
    .post("/vqr/api/token_generate")
    .set("Authorization", callbackBasicAuth());
  expect(response.status).toBe(200);
  return response.body.access_token as string;
}

let counter = 0;
async function createServiceOrder(totalAmount = 250000) {
  counter += 1;
  const res = await request(app)
    .post("/api/service-orders")
    .set("X-Admin-Token", adminToken)
    .send({
      customerName: "Khách VietQR",
      customerPhone: "0900000000",
      orderNumber: `ORD-${String(counter).padStart(3, "0")}`,
      totalAmount,
    });
  expect(res.status).toBe(200);
  return {
    id: res.body.data.id as string,
    orderNumber: res.body.data.orderNumber as string,
    amount: totalAmount,
  };
}

beforeAll(async () => {
  process.env.JWT_SECRET = adminToken;
  process.env.VIETQR_CALLBACK_USERNAME = "giaycung_callback";
  process.env.VIETQR_CALLBACK_PASSWORD = "callback_password";
  process.env.VIETQR_CALLBACK_JWT_SECRET = "callback-jwt-secret-at-least-32-characters";
  process.env.VIETQR_API_USERNAME = "provider_user";
  process.env.VIETQR_API_PASSWORD = "provider_password";
  process.env.VIETQR_BANK_CODE = "MB";
  process.env.VIETQR_BANK_ACCOUNT = "0123456789";
  process.env.VIETQR_BANK_ACCOUNT_NAME = "GIAY CUNG";

  providerServer = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");

      if (req.url === "/vqr/api/token_generate" && req.method === "POST") {
        providerTokenCalls += 1;
        const expected = `Basic ${Buffer.from("provider_user:provider_password").toString("base64")}`;
        if (req.headers.authorization !== expected) {
          res.statusCode = 401;
          res.end(JSON.stringify({ status: "FAILED", message: "INVALID_AUTH" }));
          return;
        }
        res.end(JSON.stringify({
          access_token: "provider_access_token",
          token_type: "Bearer",
          expires_in: 300,
        }));
        return;
      }

      if (req.url === "/vqr/api/qr/generate-customer" && req.method === "POST") {
        providerGenerateCalls += 1;
        lastGenerateBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        res.end(JSON.stringify({
          bankCode: "MB",
          bankAccount: "0123456789",
          userBankName: "GIAY CUNG",
          amount: String(lastGenerateBody.amount),
          content: lastGenerateBody.content,
          qrCode: "000201010212TESTQR",
          qrLink: "https://example.com/qr/test",
          transactionRefId: "provider-ref-1",
          orderId: lastGenerateBody.orderId,
        }));
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ status: "FAILED", message: "NOT_FOUND" }));
    });
  });

  await new Promise<void>((resolve) => providerServer.listen(0, "127.0.0.1", resolve));
  const address = providerServer.address() as AddressInfo;
  process.env.VIETQR_API_BASE_URL = `http://127.0.0.1:${address.port}`;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  await new Promise<void>((resolve, reject) => {
    providerServer.close((error) => error ? reject(error) : resolve());
  });
});

describe("VietQR callback authentication", () => {
  it("issues a short-lived callback token for valid Basic Auth", async () => {
    const response = await request(app)
      .post("/vqr/api/token_generate")
      .set("Authorization", callbackBasicAuth());

    expect(response.status).toBe(200);
    expect(response.body.token_type).toBe("Bearer");
    expect(response.body.expires_in).toBe(300);
    expect(response.body.access_token).toBeTruthy();
  });

  it("rejects invalid Basic Auth", async () => {
    const response = await request(app)
      .post("/vqr/api/token_generate")
      .set("Authorization", `Basic ${Buffer.from("wrong:wrong").toString("base64")}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("INVALID_AUTH");
  });

  it("rejects transaction callback without a Bearer token", async () => {
    const response = await request(app)
      .post("/vqr/bank/api/transaction-sync")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.errorReason).toBe("INVALID_AUTH");
  });
});

describe("Admin generates QR for a service order", () => {
  it("admin endpoint creates QR; provider token is cached across calls", async () => {
    resetVietQrTokenCache();
    providerTokenCalls = 0;
    providerGenerateCalls = 0;

    const first = await createServiceOrder(250000);
    const firstResponse = await request(app)
      .post(`/api/service-orders/${first.id}/payment/vietqr`)
      .set("X-Admin-Token", adminToken);

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.data.amount).toBe(250000);
    expect(firstResponse.body.data.qrCode).toBe("000201010212TESTQR");
    expect(firstResponse.body.data.orderNumber).toBe(first.orderNumber);

    const second = await createServiceOrder(300000);
    const secondResponse = await request(app)
      .post(`/api/service-orders/${second.id}/payment/vietqr`)
      .set("X-Admin-Token", adminToken);

    expect(secondResponse.status).toBe(200);
    expect(providerTokenCalls).toBe(1);
    expect(providerGenerateCalls).toBe(2);
  });

  it("requires admin token", async () => {
    const order = await createServiceOrder();
    const res = await request(app).post(`/api/service-orders/${order.id}/payment/vietqr`);
    expect(res.status).toBe(401);
  });
});

describe("Public payment endpoints (tra cứu đơn hàng)", () => {
  it("customer can generate QR via orderNumber and poll status", async () => {
    const order = await createServiceOrder(180000);

    const qrRes = await request(app)
      .post(`/api/service-orders/track/${order.orderNumber}/payment/vietqr`);
    expect(qrRes.status).toBe(200);
    expect(qrRes.body.data.qrCode).toBe("000201010212TESTQR");
    expect(qrRes.body.data.paymentStatus).toBe("pending");

    const statusRes = await request(app)
      .get(`/api/service-orders/track/${order.orderNumber}/payment-status`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.paymentStatus).toBe("pending");
    expect(statusRes.body.data.qrCode).toBeTruthy();
  });

  it("track endpoint returns payment fields", async () => {
    const order = await createServiceOrder(150000);
    await request(app).post(`/api/service-orders/track/${order.orderNumber}/payment/vietqr`);

    const res = await request(app).get(`/api/service-orders/track?order=${order.orderNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.order.paymentStatus).toBe("pending");
    expect(res.body.order.paymentQrCode).toBe("000201010212TESTQR");
  });
});

async function preparedOrder(amount = 450000) {
  const order = await createServiceOrder(amount);
  const qr = await request(app)
    .post(`/api/service-orders/${order.id}/payment/vietqr`)
    .set("X-Admin-Token", adminToken);
  expect(qr.status).toBe(200);
  const stored = await ServiceOrder.findOne({ id: order.id }).lean();
  return {
    ...order,
    paymentOrderId: stored!.paymentOrderId!,
    paymentContent: stored!.paymentContent!,
  };
}

function callbackPayload(order: Awaited<ReturnType<typeof preparedOrder>>, overrides = {}) {
  return {
    bankaccount: "0123456789",
    amount: order.amount,
    transType: "C",
    content: order.paymentContent,
    transactionid: `txn_${Date.now()}_${Math.random()}`,
    transactiontime: Date.now(),
    referencenumber: `ref_${Date.now()}_${Math.random()}`,
    orderId: order.paymentOrderId,
    ...overrides,
  };
}

describe("VietQR transaction sync", () => {
  it("marks a matching order as paid and handles duplicate callback idempotently", async () => {
    const order = await preparedOrder();
    const token = await getCallbackToken();
    const payload = callbackPayload(order);

    const first = await request(app)
      .post("/vqr/bank/api/transaction-sync")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    const duplicate = await request(app)
      .post("/vqr/bank/api/transaction-sync")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body.error).toBe(false);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.error).toBe(false);

    const status = await request(app)
      .get(`/api/service-orders/track/${order.orderNumber}/payment-status`);
    expect(status.body.data.paymentStatus).toBe("paid");
    expect(status.body.data.paidAmount).toBe(order.amount);
  });

  it("rejects amount, account, content and transaction type mismatches", async () => {
    const cases = [
      { overrides: { amount: 1 }, code: "AMOUNT_MISMATCH" },
      { overrides: { bankaccount: "9999999999" }, code: "BANK_ACCOUNT_MISMATCH" },
      { overrides: { content: "WRONG CONTENT" }, code: "CONTENT_MISMATCH" },
      { overrides: { transType: "D" }, code: "INVALID_TRANSACTION_TYPE" },
    ];

    for (const testCase of cases) {
      const order = await preparedOrder();
      const token = await getCallbackToken();
      const response = await request(app)
        .post("/vqr/bank/api/transaction-sync")
        .set("Authorization", `Bearer ${token}`)
        .send(callbackPayload(order, testCase.overrides));

      expect(response.status).toBe(400);
      expect(response.body.errorReason).toBe(testCase.code);

      const stored = await ServiceOrder.findOne({ id: order.id }).lean();
      expect(stored!.paymentStatus).toBe("pending");
    }
  });
});

describe("Admin manual mark paid", () => {
  it("enforces reason and transactionRef, writes audit", async () => {
    const order = await preparedOrder();

    const missing = await request(app)
      .post(`/api/service-orders/${order.id}/payment/manual-mark-paid`)
      .set("X-Admin-Token", adminToken)
      .send({});
    expect(missing.status).toBe(400);

    const ok = await request(app)
      .post(`/api/service-orders/${order.id}/payment/manual-mark-paid`)
      .set("X-Admin-Token", adminToken)
      .send({ reason: "Khách gửi ảnh sao kê hợp lệ", transactionRef: "MANUAL-REF-001" });

    expect(ok.status).toBe(200);
    expect(ok.body.data.paymentStatus).toBe("paid");
  });
});

describe("Payment method lifecycle", () => {
  it("newly created order has no paymentMethod yet (null)", async () => {
    const order = await createServiceOrder(120000);
    const res = await request(app).get(`/api/service-orders/track?order=${order.orderNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.order.paymentMethod ?? null).toBeNull();
    expect(res.body.order.paymentStatus).toBe("unpaid");
  });

  it("ignores paymentMethod sent in createOrder body — method is set by action", async () => {
    counter += 1;
    const orderNumber = `ORD-${String(counter).padStart(3, "0")}`;
    const res = await request(app)
      .post("/api/service-orders")
      .set("X-Admin-Token", adminToken)
      .send({
        customerName: "Khách",
        customerPhone: "0900000000",
        orderNumber,
        totalAmount: 150000,
        paymentMethod: "vietqr",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentMethod).toBeNull();
  });

  it("ignores paymentMethod sent via PATCH — admin cannot manually pick method", async () => {
    const order = await createServiceOrder(180000);
    const res = await request(app)
      .patch(`/api/service-orders/${order.id}`)
      .set("X-Admin-Token", adminToken)
      .send({ paymentMethod: "vietqr" });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentMethod).toBeNull();
  });

  it("generating QR sets paymentMethod=vietqr", async () => {
    const order = await createServiceOrder(300000);
    const qr = await request(app)
      .post(`/api/service-orders/${order.id}/payment/vietqr`)
      .set("X-Admin-Token", adminToken);
    expect(qr.status).toBe(200);
    expect(qr.body.data.paymentMethod).toBe("vietqr");

    const stored = await ServiceOrder.findOne({ id: order.id }).lean();
    expect(stored!.paymentMethod).toBe("vietqr");
    expect(stored!.paymentStatus).toBe("pending");
  });

  it("confirm-cash sets paymentMethod=cash on an order with no method", async () => {
    const order = await createServiceOrder(200000);
    const confirm = await request(app)
      .post(`/api/service-orders/${order.id}/payment/confirm-cash`)
      .set("X-Admin-Token", adminToken)
      .send({ note: "Khách trả tiền mặt khi nhận giày" });

    expect(confirm.status).toBe(200);
    expect(confirm.body.data.paymentMethod).toBe("cash");
    expect(confirm.body.data.paymentStatus).toBe("paid");
    expect(confirm.body.data.paidAmount).toBe(200000);
  });

  it("confirm-cash overrides a vietqr order with pending QR (khách đổi ý trả tiền mặt)", async () => {
    const order = await preparedOrder();
    const before = await ServiceOrder.findOne({ id: order.id }).lean();
    expect(before!.paymentMethod).toBe("vietqr");
    expect(before!.paymentStatus).toBe("pending");

    const confirm = await request(app)
      .post(`/api/service-orders/${order.id}/payment/confirm-cash`)
      .set("X-Admin-Token", adminToken)
      .send({ note: "Khách đổi ý trả tiền mặt" });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.paymentMethod).toBe("cash");
    expect(confirm.body.data.paymentStatus).toBe("paid");
  });

  it("rejects confirm-cash on a cancelled order", async () => {
    const order = await createServiceOrder(99000);
    await request(app)
      .patch(`/api/service-orders/${order.id}`)
      .set("X-Admin-Token", adminToken)
      .send({ status: "cancelled" });
    const res = await request(app)
      .post(`/api/service-orders/${order.id}/payment/confirm-cash`)
      .set("X-Admin-Token", adminToken)
      .send({});
    expect(res.status).toBe(409);
  });

  it("rejects confirm-cash on an already paid order", async () => {
    const order = await createServiceOrder(99000);
    await request(app)
      .post(`/api/service-orders/${order.id}/payment/confirm-cash`)
      .set("X-Admin-Token", adminToken)
      .send({});
    const res = await request(app)
      .post(`/api/service-orders/${order.id}/payment/confirm-cash`)
      .set("X-Admin-Token", adminToken)
      .send({});
    expect(res.status).toBe(409);
  });

  it("allows order status to advance to completed while paymentStatus stays unpaid", async () => {
    const order = await createServiceOrder(99000);

    const patch = await request(app)
      .patch(`/api/service-orders/${order.id}`)
      .set("X-Admin-Token", adminToken)
      .send({ status: "completed" });
    expect(patch.status).toBe(200);

    const stored = await ServiceOrder.findOne({ id: order.id }).lean();
    expect(stored!.status).toBe("completed");
    expect(stored!.paymentStatus).toBe("unpaid");
    expect(stored!.paymentMethod ?? null).toBeNull();
  });
});
