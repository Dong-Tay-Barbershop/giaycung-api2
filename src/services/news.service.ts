import { Request } from "express";
import News from "@/models/News";
import { parsePagination, paginatedResponse } from "@/utils/pagination";

export async function listNews(query: Request["query"]) {
  // GET?id= → single item
  if (query.id) {
    const doc = await News.findOne({ id: String(query.id) }).lean();
    if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
    return { ok: true, data: doc };
  }

  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.q) {
    const escaped = String(query.q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    filter.$or = [{ title: re }, { excerpt: re }, { content: re }];
  }

  const [data, total] = await Promise.all([
    News.find(filter).sort({ publishedDate: -1 }).skip(skip).limit(limit).lean(),
    News.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function createNews(body: Record<string, unknown>) {
  const { title, excerpt, content, imageUrl } = body;
  if (!title || !excerpt || !content || !imageUrl) {
    throw Object.assign(new Error("Missing required: title, excerpt, content, imageUrl"), { status: 400 });
  }
  const { category, author, publishedDate, status } = body;
  const doc = await News.create({ title, excerpt, content, imageUrl, category, author, publishedDate, status });
  return { id: doc.id };
}

export async function updateNews(id: string, body: Record<string, unknown>) {
  const { title, excerpt, content, imageUrl, category, author, publishedDate, status } = body;
  const updates = { title, excerpt, content, imageUrl, category, author, publishedDate, status };
  const doc = await News.findOneAndUpdate({ id }, updates, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteNews(id: string) {
  const doc = await News.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
