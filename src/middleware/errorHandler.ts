import { Request, Response, NextFunction } from "express";
import { safeError } from "../utils/redact";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ ok: false, message: "Not found" });
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error(safeError(err));
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? (err.message || "Bad request") : "Internal server error";
  res.status(status).json({ ok: false, message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
