import bcrypt from "bcrypt";
import Admin from "../models/Admin";
import { signToken } from "../middleware/auth";

export async function loginAdmin(email: string, password: string) {
  const secret = (process.env.JWT_SECRET || "").trim();
  if (!secret) throw Object.assign(new Error("Missing JWT_SECRET"), { status: 500 });

  const admin = await Admin.findOne({ email }).lean();
  if (!admin) return null;

  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) return null;

  const token = signToken(
    { email: admin.email, role: admin.role, exp: Date.now() + 1000 * 60 * 60 * 24 },
    secret
  );

  return { token, user: { email: admin.email, role: admin.role } };
}
