import { Request, Response } from "express";
import { listAdmins, createAdmin, changePassword } from "../services/auth.service";

export async function getAdmins(_req: Request, res: Response): Promise<void> {
  const data = await listAdmins();
  res.json({ ok: true, data });
}

export async function addAdmin(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ ok: false, message: "Missing email or password" });
    return;
  }

  const user = await createAdmin({ email: String(email), password: String(password), name: name ? String(name) : undefined });
  res.json({ ok: true, user });
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ ok: false, message: "Missing currentPassword or newPassword" });
    return;
  }

  const email = res.locals.adminEmail as string | undefined;
  await changePassword(String(email || ""), String(currentPassword), String(newPassword));
  res.json({ ok: true, message: "Đổi mật khẩu thành công" });
}
