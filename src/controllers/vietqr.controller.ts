import { Request, Response } from "express";
import { issueVietQrCallbackToken } from "../middleware/vietqrAuth";
import {
  VietQrCallbackError,
  confirmCashPayment,
  createPaymentQr,
  getPaymentStatus,
  manualMarkPaid,
  processTransaction,
} from "../services/vietqr.service";

export async function tokenGenerate(req: Request, res: Response): Promise<void> {
  try {
    const token = issueVietQrCallbackToken(String(req.headers.authorization || ""));
    if (!token) {
      res.status(401).json({ status: "FAILED", message: "INVALID_AUTH" });
      return;
    }
    res.json(token);
  } catch {
    res.status(503).json({ status: "FAILED", message: "CONFIGURATION_ERROR" });
  }
}

export async function transactionSync(req: Request, res: Response): Promise<void> {
  try {
    const object = await processTransaction(req.body || {});
    res.json({
      error: false,
      errorReason: "",
      toastMessage: "Transaction processed",
      object,
    });
  } catch (error) {
    if (error instanceof VietQrCallbackError) {
      res.status(error.status).json({
        error: true,
        errorReason: error.code,
        toastMessage: error.message,
        object: null,
      });
      return;
    }
    throw error;
  }
}

// Admin: tạo QR cho một service order theo id hoặc orderNumber.
export async function generateServiceOrderQr(req: Request, res: Response): Promise<void> {
  const data = await createPaymentQr(req.params.id);
  res.json({ ok: true, data });
}

// Public: tra cứu trạng thái thanh toán + thông tin QR (theo orderNumber).
// Dùng cho trang tra cứu đơn hàng — khách chỉ cần biết orderNumber.
export async function publicPaymentStatus(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code || req.query.order || req.query.orderNumber || "");
  if (!code) {
    res.status(400).json({ ok: false, message: "Missing order code" });
    return;
  }
  const data = await getPaymentStatus(code);
  res.json({ ok: true, data });
}

// Public: khách bấm "Thanh toán bằng QR" trên trang tra cứu → BE tạo (hoặc trả về) QR.
export async function publicGenerateQr(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code || "");
  if (!code) {
    res.status(400).json({ ok: false, message: "Missing order code" });
    return;
  }
  const data = await createPaymentQr(code);
  res.json({ ok: true, data });
}

export async function adminManualMarkPaid(req: Request, res: Response): Promise<void> {
  const adminEmail = String(res.locals.adminEmail || "");
  const data = await manualMarkPaid(req.params.id, req.body || {}, adminEmail);
  res.json({ ok: true, data });
}

// Admin xác nhận đã nhận tiền mặt cho đơn cash.
export async function adminConfirmCashPayment(req: Request, res: Response): Promise<void> {
  const adminEmail = String(res.locals.adminEmail || "");
  const data = await confirmCashPayment(req.params.id, req.body || {}, adminEmail);
  res.json({ ok: true, data });
}
