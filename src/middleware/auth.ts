import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

// ===== HELPERS =====

function safeTrim(x: unknown): string {
  return String(x ?? "").trim();
}

function base64urlToBuffer(b64url: string): Buffer {
  const b64 = String(b64url).replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s); } catch { return null; }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ===== JWT HS256 =====

export function signToken(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwtHs256(tokenRaw: string, secret: string): { ok: boolean; payload?: Record<string, unknown> } {
  const token = safeTrim(tokenRaw);
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };

  const [h, p, sig] = parts;
  const header = safeJsonParse(base64urlToBuffer(h).toString("utf8"));
  const payload = safeJsonParse(base64urlToBuffer(p).toString("utf8"));

  if (!header || header["alg"] !== "HS256") return { ok: false };
  if (!payload) return { ok: false };

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64url");

  if (!timingSafeEqualStr(sig, expectedSig)) return { ok: false };

  // exp stored as milliseconds (consistent with existing API)
  if (payload["exp"]) {
    const expMs = (payload["exp"] as number) < 1e12
      ? (payload["exp"] as number) * 1000
      : (payload["exp"] as number);
    if (Date.now() > expMs) return { ok: false };
  }

  if (payload["role"] && payload["role"] !== "admin") return { ok: false };

  return { ok: true, payload };
}

// ===== SECRET RESOLUTION =====

function getAdminSecret(): string {
  return (
    safeTrim(process.env.JWT_SECRET) ||
    safeTrim(process.env.ADMIN_TOKEN_SECRET) ||
    safeTrim(process.env.ADMIN_TOKEN) ||
    ""
  );
}

// ===== MIDDLEWARE =====

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = getAdminSecret();

  if (!secret) {
    res.status(500).json({ ok: false, message: "Server misconfiguration: missing auth secret" });
    return;
  }

  const xToken = safeTrim(req.headers?.["x-admin-token"]);
  const bearer = safeTrim(req.headers?.["authorization"] || "").replace(/^Bearer\s+/i, "");
  const token = xToken || bearer;

  if (!token) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }

  // backward-compat: raw secret used as token
  if (timingSafeEqualStr(token, secret)) return next();

  // JWT HS256
  if (verifyJwtHs256(token, secret).ok) return next();

  res.status(401).json({ ok: false, message: "Unauthorized" });
}
