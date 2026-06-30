import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const CALLBACK_ISSUER = "giaycung-api";
const CALLBACK_AUDIENCE = "vietqr-callback";
const CALLBACK_SCOPE = "vietqr:transaction-sync";
const TOKEN_TTL_SECONDS = 300;

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signCallbackToken(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function parseBase64UrlJson(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function verifyCallbackToken(token: string, secret: string, username: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = parseBase64UrlJson(encodedHeader);
  const payload = parseBase64UrlJson(encodedPayload);
  if (!header || header.alg !== "HS256" || !payload) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  if (!timingSafeEqualString(signature, expectedSignature)) return false;

  const now = Math.floor(Date.now() / 1000);
  return (
    payload.sub === username &&
    payload.iss === CALLBACK_ISSUER &&
    payload.aud === CALLBACK_AUDIENCE &&
    payload.scope === CALLBACK_SCOPE &&
    typeof payload.exp === "number" &&
    payload.exp > now
  );
}

function callbackConfig() {
  const username = String(process.env.VIETQR_CALLBACK_USERNAME || "").trim();
  const password = String(process.env.VIETQR_CALLBACK_PASSWORD || "");
  const secret = String(process.env.VIETQR_CALLBACK_JWT_SECRET || "").trim();

  if (!username || !password || secret.length < 32) {
    throw Object.assign(new Error("VietQR callback is not configured"), { status: 503 });
  }

  return { username, password, secret };
}

function parseBasicAuth(header: string): { username: string; password: string } | null {
  if (!/^Basic\s+/i.test(header)) return null;

  try {
    const decoded = Buffer.from(header.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function issueVietQrCallbackToken(authorizationHeader: string) {
  const { username, password, secret } = callbackConfig();
  const credentials = parseBasicAuth(authorizationHeader);

  if (
    !credentials ||
    !timingSafeEqualString(credentials.username, username) ||
    !timingSafeEqualString(credentials.password, password)
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const accessToken = signCallbackToken(
    {
      sub: username,
      iss: CALLBACK_ISSUER,
      aud: CALLBACK_AUDIENCE,
      scope: CALLBACK_SCOPE,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    secret
  );

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
  };
}

export function requireVietQrCallbackToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let config: ReturnType<typeof callbackConfig>;
  try {
    config = callbackConfig();
  } catch {
    res.status(503).json({
      error: true,
      errorReason: "CONFIGURATION_ERROR",
      toastMessage: "VietQR callback is not configured",
      object: null,
    });
    return;
  }

  const authorization = String(req.headers.authorization || "");
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) {
    res.status(401).json({
      error: true,
      errorReason: "INVALID_AUTH",
      toastMessage: "Unauthorized",
      object: null,
    });
    return;
  }

  if (verifyCallbackToken(token, config.secret, config.username)) {
    next();
    return;
  }

  res.status(401).json({
    error: true,
    errorReason: "INVALID_AUTH",
    toastMessage: "Unauthorized",
    object: null,
  });
}
