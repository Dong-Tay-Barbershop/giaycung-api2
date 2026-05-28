import { Request, Response } from "express";
import { loginAdmin } from "@/services/auth.service";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ ok: false, message: "Missing email or password" });
    return;
  }

  const result = await loginAdmin(String(email), String(password));
  if (!result) {
    res.status(401).json({ ok: false, message: "Sai email hoặc mật khẩu" });
    return;
  }

  res.json({ ok: true, ...result });
}
