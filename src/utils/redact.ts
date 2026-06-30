const SENSITIVE_KEYS = new Set(
  [
    "authorization",
    "cookie",
    "set-cookie",
    "x-checkout-token",
    "checkouttoken",
    "password",
    "secret",
    "token",
    "access_token",
    "accesstoken",
    "refresh_token",
    "jwt",
    "jwtsecret",
    "apikey",
    "api_key",
    "x-api-key",
    "paymentraw",
  ].map((key) => key.toLowerCase())
);

const REDACTED = "[REDACTED]";

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else {
      result[key] = redact(raw, depth + 1);
    }
  }
  return result;
}

export function safeError(err: unknown): { message: string; status?: number; stack?: string } {
  if (err instanceof Error) {
    const status = (err as Error & { status?: number; statusCode?: number }).status
      ?? (err as Error & { status?: number; statusCode?: number }).statusCode;
    return {
      message: err.message,
      ...(status ? { status } : {}),
      ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
    };
  }
  return { message: String(err) };
}
