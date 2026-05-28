import { Request, Response } from "express";
import * as svc from "../services/contact.service";

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await svc.listContacts(req.query));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.createContact(req.body || {}) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || req.body?.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing id" }); return; }
  res.json({ ok: true, data: await svc.updateContact(id, req.body || {}) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing query: id" }); return; }
  res.json({ ok: true, data: await svc.deleteContact(id) });
}
