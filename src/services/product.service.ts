import { Request } from "express";
import Product from "@/models/Product";
import { parsePagination, paginatedResponse } from "@/utils/pagination";

export async function listProducts(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    Product.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function createProduct(body: Record<string, unknown>) {
  const { name, description, imageUrl, category } = body;
  if (!name || !description || !imageUrl || !category) {
    throw Object.assign(
      new Error("Missing required fields: name, description, imageUrl, category"),
      { status: 400 }
    );
  }
  const { price, stock, status } = body;
  const doc = await Product.create({ name, description, imageUrl, category, price, stock, status });
  return { id: doc.id };
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  const { name, description, imageUrl, category, price, stock, status } = body;
  const updates = { name, description, imageUrl, category, price, stock, status };
  const doc = await Product.findOneAndUpdate({ id }, updates, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteProduct(id: string) {
  const doc = await Product.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
