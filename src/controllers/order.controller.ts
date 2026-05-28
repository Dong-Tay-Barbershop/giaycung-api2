import { Request, Response } from "express";
import * as svc from "../services/order.service";

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await svc.listOrders(req.query));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.getOrder(req.params.id) });
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
