import cors from "cors";

const DEFAULT_ORIGINS = [
  "https://giaycung.vn",
  "https://www.giaycung.vn",
  "https://giay-cung4.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getAllowedOrigins(): string[] {
  const env = (process.env.ALLOWED_ORIGINS || "").trim();
  if (!env) return DEFAULT_ORIGINS;
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;
  return /^https:\/\/.*\.vercel\.app$/.test(origin);
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    // non-browser requests (curl, Postman, server-to-server) have no origin
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  maxAge: 86400,
});
