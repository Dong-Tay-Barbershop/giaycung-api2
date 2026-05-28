import { Request } from "express";
import Service from "@/models/Service";
import { parsePagination, paginatedResponse } from "@/utils/pagination";

export async function listServices(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);
  const isAll = query.all || query.status === "all";
  const filter: Record<string, unknown> =
    isAll ? {} : { status: query.status ?? "published" };

  const [data, total] = await Promise.all([
    Service.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
    Service.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function createService(body: Record<string, unknown>) {
  if (!body.title) throw Object.assign(new Error("Missing required field: title"), { status: 400 });
  const { title, description, price, duration, imageUrl, features, status } = body;
  const doc = await Service.create({ title, description, price, duration, imageUrl, features, status });
  return { id: doc.id };
}

export async function updateService(id: string, body: Record<string, unknown>) {
  const { title, description, price, duration, imageUrl, features, status } = body;
  const updates = { title, description, price, duration, imageUrl, features, status };
  const doc = await Service.findOneAndUpdate({ id }, updates, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteService(id: string) {
  const doc = await Service.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
