import { Request } from "express";
import ServiceOrder from "@/models/ServiceOrder";
import { parsePagination, paginatedResponse } from "@/utils/pagination";

// ===== ORDER NUMBER =====

async function nextOrderNumber(): Promise<string> {
  const orders = await ServiceOrder.find({}, { orderNumber: 1 }).lean();
  let max = 0;
  for (const o of orders) {
    const m = o.orderNumber.match(/^ORD-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `ORD-${String(max + 1).padStart(3, "0")}`;
}

// ===== ORDER CRUD =====

export async function listOrders(query: Request["query"]) {
  const { page, limit, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    ServiceOrder.find(filter).sort({ createdDate: -1, orderNumber: -1 }).skip(skip).limit(limit).lean(),
    ServiceOrder.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function trackOrder(code: string) {
  const escaped = code.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doc = await ServiceOrder.findOne({
    orderNumber: { $regex: new RegExp(`^${escaped}$`, "i") },
  }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}

export async function getOrder(id: string) {
  const doc = await ServiceOrder.findOne({ id }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}

export async function createOrder(body: Record<string, unknown>) {
  const { customerName, customerPhone } = body;
  if (!customerName || !customerPhone) {
    throw Object.assign(new Error("Missing: customerName, customerPhone"), { status: 400 });
  }

  const orderNumber = String(body.orderNumber || (await nextOrderNumber()));
  const createdDate = String(body.createdDate || new Date().toISOString().slice(0, 10));
  const { assignedTo, totalAmount, status } = body;

  const doc = await ServiceOrder.create({ customerName, customerPhone, orderNumber, createdDate, assignedTo, totalAmount, status, shoes: [] });
  return { id: doc.id, orderNumber: doc.orderNumber };
}

export async function updateOrder(id: string, body: Record<string, unknown>) {
  const { status, assignedTo, totalAmount } = body;
  const doc = await ServiceOrder.findOneAndUpdate({ id }, { status, assignedTo, totalAmount }, { new: true });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id: doc.id };
}

export async function deleteOrder(id: string) {
  const doc = await ServiceOrder.findOneAndDelete({ id });
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return { id };
}

// ===== SHOE CRUD =====

export async function addShoe(orderId: string, body: Record<string, unknown>) {
  const { name, service } = body;
  if (!name || !service) {
    throw Object.assign(new Error("Missing: shoe.name, shoe.service"), { status: 400 });
  }

  const shoeId = String(body.id || `shoe_${Date.now()}`);
  const shoe = {
    id: shoeId,
    name: String(name),
    service: String(service),
    status: String(body.status || "received"),
    images: Array.isArray(body.images) ? body.images : [],
    notes: String(body.notes || ""),
    deleted: false,
  };

  const doc = await ServiceOrder.findOneAndUpdate(
    { id: orderId },
    { $push: { shoes: shoe } },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error("Order not found"), { status: 404 });
  return { id: shoeId };
}

export async function updateShoe(
  orderId: string,
  shoeId: string,
  body: Record<string, unknown>
) {
  const order = await ServiceOrder.findOne({ id: orderId });
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

  const shoe = order.shoes.find((s) => s.id === shoeId);
  if (!shoe) throw Object.assign(new Error("Shoe not found"), { status: 404 });

  const updatable = ["name", "service", "status", "images", "notes", "deleted"] as const;
  for (const k of updatable) {
    if (k in body) {
      if (k === "images") {
        (shoe as unknown as Record<string, unknown>)[k] = Array.isArray(body[k]) ? body[k] : shoe.images;
      } else {
        (shoe as unknown as Record<string, unknown>)[k] = body[k];
      }
    }
  }

  await order.save();
  return { id: shoeId };
}

export async function deleteShoe(orderId: string, shoeId: string) {
  const doc = await ServiceOrder.findOneAndUpdate(
    { id: orderId, "shoes.id": shoeId },
    { $set: { "shoes.$.deleted": true } },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error("Order or shoe not found"), { status: 404 });
  return { id: shoeId };
}
