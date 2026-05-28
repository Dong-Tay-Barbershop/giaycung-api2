import { Request } from "express";
import Order from "../models/Order";
import { parsePagination, paginatedResponse } from "../utils/pagination";

function calcTotal(items: Array<{ quantity: number; price: number }>) {
  return items.reduce((sum, i) => sum + i.quantity * i.price, 0);
}

export async function listOrders(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function getOrder(id: string) {
  const doc = await Order.findOne({ id }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}

export async function createOrder(body: Record<string, unknown>) {
  const { customerName, customerPhone, customerAddress } = body;
  if (!customerName || !customerPhone || !customerAddress) {
    throw Object.assign(new Error("Missing required: customerName, customerPhone, customerAddress"), { status: 400 });
  }

  const items = (Array.isArray(body.items) ? body.items : []) as Array<{ productId?: string; productName?: string; quantity?: number; price?: number }>;
  const validItems = items.filter((it) => it.productName && Number(it.quantity) > 0 && Number(it.price) >= 0);
  if (!validItems.length) {
    throw Object.assign(new Error("Giỏ hàng trống"), { status: 400 });
  }

  const totalAmount = calcTotal(validItems as Array<{ quantity: number; price: number }>);
  const notes = body.notes;

  const doc = await Order.create({ customerName, customerPhone, customerAddress, notes, items: validItems, totalAmount });
  return { id: doc.id };
}

export async function updateOrder(id: string, body: Record<string, unknown>) {
  const { status, notes } = body;
  const doc = await Order.findOneAndUpdate({ id }, { status, notes }, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteOrder(id: string) {
  const doc = await Order.findOneAndUpdate(
    { id },
    { status: "cancelled" },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}
