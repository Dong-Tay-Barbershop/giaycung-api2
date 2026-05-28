import { Request } from "express";
import Message from "@/models/Message";
import { parsePagination, paginatedResponse } from "@/utils/pagination";

export async function listMessages(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function createMessage(body: Record<string, unknown>) {
  const { fullName, phone, message } = body;
  if (!fullName || !phone || !message) {
    throw Object.assign(new Error("Missing required: fullName, phone, message"), { status: 400 });
  }
  const email = body.email;
  const source = body.source || "contact-page";
  const doc = await Message.create({ fullName, phone, email, message, source });
  return { id: doc.id };
}

export async function updateMessage(id: string, body: Record<string, unknown>) {
  const { status } = body;
  const doc = await Message.findOneAndUpdate({ id }, { status }, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteMessage(id: string) {
  const doc = await Message.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
