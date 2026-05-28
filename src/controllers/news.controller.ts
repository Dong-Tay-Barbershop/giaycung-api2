import { Request, Response } from "express";
import * as svc from "@/services/news.service";

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await svc.listNews(req.query));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await svc.createNews(req.body || {}) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing query: id" }); return; }
  res.json({ ok: true, data: await svc.updateNews(id, req.body || {}) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = String(req.query.id || "");
  if (!id) { res.status(400).json({ ok: false, message: "Missing query: id" }); return; }
  res.json({ ok: true, data: await svc.deleteNews(id) });
}
