import { Request, Response } from "express";
import * as svc from "../services/product.service";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await svc.listProducts(req.query);
  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = await svc.createProduct(req.body || {});
  res.json({ ok: true, data });
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing query: id" }); return; }
  const data = await svc.updateProduct(id, req.body || {});
  res.json({ ok: true, data });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing query: id" }); return; }
  const data = await svc.deleteProduct(id);
  res.json({ ok: true, data });
}
