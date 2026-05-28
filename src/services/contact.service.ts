import { Request } from "express";
import Contact from "../models/Contact";
import { parsePagination, paginatedResponse } from "../utils/pagination";

export async function listContacts(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);

  const [data, total] = await Promise.all([
    Contact.find().sort({ _id: 1 }).skip(skip).limit(limit).lean(),
    Contact.countDocuments(),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function createContact(body: Record<string, unknown>) {
  const { name, address, phone, email } = body;
  if (!name || !address || !phone || !email) {
    throw Object.assign(new Error("Missing required: name, address, phone, email"), { status: 400 });
  }
  const { hours, googleMapsUrl } = body;
  const doc = await Contact.create({ name, address, phone, email, hours, googleMapsUrl });
  return { id: doc.id };
}

export async function updateContact(id: string, body: Record<string, unknown>) {
  const { name, address, phone, email, hours, googleMapsUrl } = body;
  const updates = { name, address, phone, email, hours, googleMapsUrl };
  const doc = await Contact.findOneAndUpdate({ id }, updates, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteContact(id: string) {
  const doc = await Contact.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
