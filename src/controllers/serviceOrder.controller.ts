import { Request, Response } from "express";
import * as svc from "../services/serviceOrder.service";

// ===== ORDERS =====

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await svc.listOrders(req.query));
}

export async function track(req: Request, res: Response): Promise<void> {
  const code = String(req.query.order || req.query.orderNumber || req.query.code || "");
  if (!code) { res.status(400).json({ ok: false, message: "Missing query: order" }); return; }
  res.json({ ok: true, order: await svc.trackOrder(code) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, order: await svc.getOrder(req.params.id) });
}

export async function create(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.createOrder(req.body || {}) });
}

export async function update(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.updateOrder(req.params.id, req.body || {}) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.deleteOrder(req.params.id) });
}

// ===== SHOES =====

export async function addShoe(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.addShoe(req.params.id, req.body || {}) });
}

export async function updateShoe(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.updateShoe(req.params.id, req.params.shoeId, req.body || {}) });
}

export async function deleteShoe(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.deleteShoe(req.params.id, req.params.shoeId) });
}
