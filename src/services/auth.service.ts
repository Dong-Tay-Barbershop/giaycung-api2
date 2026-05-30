import bcrypt from "bcrypt";
import Admin from "../models/Admin";
import { signToken } from "../middleware/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listAdmins() {
  const docs = await Admin.find({}, { passwordHash: 0 }).lean();
  return docs.map((d) => ({ id: String(d._id), email: d.email, name: d.name, role: d.role }));
}

export async function createAdmin(body: { email: string; password: string; name?: string }) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!EMAIL_RE.test(email)) throw Object.assign(new Error("Email không hợp lệ"), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error("Password tối thiểu 6 ký tự"), { status: 400 });

  const existing = await Admin.findOne({ email }).lean();
  if (existing) throw Object.assign(new Error("Email đã tồn tại"), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const doc = await Admin.create({ email, passwordHash, name });
  return { id: String(doc._id), email: doc.email, name: doc.name, role: doc.role };
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  if (!email) throw Object.assign(new Error("Không xác định được tài khoản"), { status: 401 });
  if (newPassword.length < 6) throw Object.assign(new Error("Mật khẩu mới tối thiểu 6 ký tự"), { status: 400 });

  const admin = await Admin.findOne({ email });
  if (!admin) throw Object.assign(new Error("Không tìm thấy tài khoản"), { status: 404 });

  const match = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!match) throw Object.assign(new Error("Mật khẩu hiện tại không đúng"), { status: 400 });

  admin.passwordHash = await bcrypt.hash(newPassword, 10);
  await admin.save();
}

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
