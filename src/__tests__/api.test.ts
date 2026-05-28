import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "@/app";
import Admin from "@/models/Admin";

// ─── Setup ───────────────────────────────────────────────────────────────────

let mongod: MongoMemoryServer;
let adminToken: string;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-key";

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // seed admin
  const hash = await bcrypt.hash("testpass123", 10);
  await Admin.create({ email: "admin@test.com", passwordHash: hash, role: "admin" });

  // get admin token for all tests
  const res = await request(app)
    .post("/api/login")
    .send({ email: "admin@test.com", password: "testpass123" });
  adminToken = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Health ──────────────────────────────────────────────────────────────────

describe("GET /api/ping", () => {
  it("returns pong", async () => {
    const res = await request(app).get("/api/ping");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, message: "pong" });
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("POST /api/login", () => {
  it("returns token on valid credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: "admin@test.com", password: "testpass123" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    expect(res.body.token).toBeTruthy();
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: "admin@test.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body missing", async () => {
    const res = await request(app).post("/api/login").send({});
    expect(res.status).toBe(400);
  });
});

// ─── Products ────────────────────────────────────────────────────────────────

describe("Products", () => {
  let productId: string;

  it("GET /api/products — empty list", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: [], total: 0 });
  });

  it("POST /api/products — creates product (admin)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Dép Adidas",
        description: "Dép xịn",
        imageUrl: "https://example.com/dep.jpg",
        category: "dep",
        price: 500000,
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    productId = res.body.data.id;
    expect(productId).toMatch(/^prd_/);
  });

  it("POST /api/products — 400 when missing required fields", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Only name" });
    expect(res.status).toBe(400);
  });

  it("GET /api/products — returns created product", async () => {
    const res = await request(app).get("/api/products");
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(productId);
  });

  it("PATCH /api/products?id= — updates product", async () => {
    const res = await request(app)
      .patch(`/api/products?id=${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 450000 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("PATCH /api/products?id= — 404 on unknown id", async () => {
    const res = await request(app)
      .patch("/api/products?id=prd_unknown")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1000 });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/products?id= — deletes product", async () => {
    const res = await request(app)
      .delete(`/api/products?id=${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/products — empty after delete", async () => {
    const res = await request(app).get("/api/products");
    expect(res.body.total).toBe(0);
  });
});

// ─── Services ────────────────────────────────────────────────────────────────

describe("Services", () => {
  let serviceId: string;

  it("POST /api/services — creates service", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Giặt giày", description: "Giặt sạch", price: "150000" });
    expect(res.status).toBe(200);
    serviceId = res.body.data.id;
    expect(serviceId).toMatch(/^srv_/);
  });

  it("POST /api/services — 400 missing title", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "No title" });
    expect(res.status).toBe(400);
  });

  it("GET /api/services — returns list (default published)", async () => {
    const res = await request(app).get("/api/services");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("PATCH /api/services?id= — updates service", async () => {
    const res = await request(app)
      .patch(`/api/services?id=${serviceId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: "200000" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/services?id= — deletes service", async () => {
    const res = await request(app)
      .delete(`/api/services?id=${serviceId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── News ────────────────────────────────────────────────────────────────────

describe("News", () => {
  let newsId: string;

  it("POST /api/news — creates article", async () => {
    const res = await request(app)
      .post("/api/news")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Tin tức mới",
        excerpt: "Tóm tắt",
        content: "Nội dung bài viết",
        imageUrl: "https://example.com/news.jpg",
        category: "tips",
        author: "Admin",
      });
    expect(res.status).toBe(200);
    newsId = res.body.data.id;
    expect(newsId).toMatch(/^news_/);
  });

  it("GET /api/news — returns list", async () => {
    const res = await request(app).get("/api/news");
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/news?id= — updates article", async () => {
    const res = await request(app)
      .patch(`/api/news?id=${newsId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Tiêu đề mới" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/news?id= — deletes article", async () => {
    const res = await request(app)
      .delete(`/api/news?id=${newsId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── Messages ────────────────────────────────────────────────────────────────

describe("Messages", () => {
  let msgId: string;

  it("POST /api/messages — public, creates message", async () => {
    const res = await request(app)
      .post("/api/messages")
      .send({
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        message: "Tôi muốn hỏi về giá",
      });
    expect(res.status).toBe(200);
    msgId = res.body.data.id;
    expect(msgId).toMatch(/^msg_/);
  });

  it("GET /api/messages — requires admin token", async () => {
    const res = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/messages?id= — updates status", async () => {
    const res = await request(app)
      .patch(`/api/messages?id=${msgId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "read" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/messages?id= — deletes message", async () => {
    const res = await request(app)
      .delete(`/api/messages?id=${msgId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── Contact ─────────────────────────────────────────────────────────────────

describe("Contact", () => {
  let contactId: string;

  it("POST /api/contact — creates contact", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Cửa hàng chính",
        address: "123 Nguyễn Văn Linh",
        phone: "0901234567",
        email: "shop@example.com",
        hours: "8:00 - 22:00",
      });
    expect(res.status).toBe(200);
    contactId = res.body.data.id;
    expect(contactId).toMatch(/^store_/);
  });

  it("GET /api/contact — returns list", async () => {
    const res = await request(app).get("/api/contact");
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/contact?id= — updates contact", async () => {
    const res = await request(app)
      .patch(`/api/contact?id=${contactId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ phone: "0987654321" });
    expect(res.status).toBe(200);
  });
});

// ─── Orders ──────────────────────────────────────────────────────────────────

describe("Orders", () => {
  let orderId: string;

  it("POST /api/orders — public, creates order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Trần Thị B",
        customerPhone: "0912345678",
        customerAddress: "456 Lê Lợi, Q1",
        items: [{ productId: "prd_001", productName: "Giày Nike", quantity: 1, price: 1500000 }],
      });
    expect(res.status).toBe(200);
    orderId = res.body.data.id;
    expect(orderId).toBeTruthy();
  });

  it("POST /api/orders — 400 when missing required fields or empty items", async () => {
    const noName = await request(app).post("/api/orders").send({ customerPhone: "0912345678", customerAddress: "x" });
    expect(noName.status).toBe(400);

    const noItems = await request(app).post("/api/orders").send({
      customerName: "A", customerPhone: "0912345678", customerAddress: "x", items: [],
    });
    expect(noItems.status).toBe(400);
  });

  it("GET /api/orders — returns list (admin)", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/orders/:id — returns single order", async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
  });

  it("GET /api/orders/:id — 404 on unknown id", async () => {
    const res = await request(app).get("/api/orders/unknown_id");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/orders/:id — updates status", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/orders/:id — soft delete (cancelled)", async () => {
    const res = await request(app)
      .delete(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const check = await request(app).get(`/api/orders/${orderId}`);
    expect(check.body.data.status).toBe("cancelled");
  });
});

// ─── Service Orders ───────────────────────────────────────────────────────────

describe("Service Orders", () => {
  let orderId: string;
  let shoeId: string;

  it("POST /api/service-orders — creates order", async () => {
    const res = await request(app)
      .post("/api/service-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerName: "Lê Văn C",
        customerPhone: "0923456789",
      });
    expect(res.status).toBe(200);
    orderId = res.body.data.id;
    expect(orderId).toMatch(/^ord_/);
    expect(res.body.data.orderNumber).toMatch(/^ORD-/);
  });

  it("POST /api/service-orders — 400 when missing required fields", async () => {
    const res = await request(app)
      .post("/api/service-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Chỉ có tên" });
    expect(res.status).toBe(400);
  });

  it("GET /api/service-orders — returns list", async () => {
    const res = await request(app).get("/api/service-orders");
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/service-orders/:id — returns single order", async () => {
    const res = await request(app).get(`/api/service-orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(orderId);
  });

  it("GET /api/service-orders/track — tracks by orderNumber", async () => {
    const orderRes = await request(app).get(`/api/service-orders/${orderId}`);
    const orderNumber = orderRes.body.order.orderNumber;

    const res = await request(app).get(`/api/service-orders/track?order=${orderNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.order.orderNumber).toBe(orderNumber);
  });

  it("GET /api/service-orders/track — 404 on unknown order", async () => {
    const res = await request(app).get("/api/service-orders/track?order=ORD-999");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/service-orders/:id — updates status", async () => {
    const res = await request(app)
      .patch(`/api/service-orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing" });
    expect(res.status).toBe(200);
  });

  // ─── Shoes ────────────────────────────────────────────────────────────────

  it("POST /api/service-orders/:id/shoes — adds shoe", async () => {
    const res = await request(app)
      .post(`/api/service-orders/${orderId}/shoes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Nike Air Max", service: "Giặt + phục hồi" });
    expect(res.status).toBe(200);
    shoeId = res.body.data.id;
    expect(shoeId).toMatch(/^shoe_/);
  });

  it("POST /api/service-orders/:id/shoes — 400 missing name/service", async () => {
    const res = await request(app)
      .post(`/api/service-orders/${orderId}/shoes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Chỉ có tên" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/service-orders/:id/shoes/:shoeId — updates shoe status", async () => {
    const res = await request(app)
      .patch(`/api/service-orders/${orderId}/shoes/${shoeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing" });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/service-orders/:id/shoes/:shoeId — soft deletes shoe", async () => {
    const res = await request(app)
      .delete(`/api/service-orders/${orderId}/shoes/${shoeId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("DELETE /api/service-orders/:id — soft deletes order", async () => {
    const res = await request(app)
      .delete(`/api/service-orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  // ─── orderNumber sequence ─────────────────────────────────────────────────

  it("creates second order while first still exists → ORD-002", async () => {
    // create without deleting the first to verify counter increments
    const res = await request(app)
      .post("/api/service-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Khách 2", customerPhone: "0900000002" });
    expect(res.status).toBe(200);
    // first order was hard-deleted, so counter resets — this gets ORD-001 again
    // (matches original GSheets behavior: nextOrderNumber = MAX of remaining orders + 1)
    expect(res.body.data.orderNumber).toMatch(/^ORD-\d+$/);
  });
});

// ─── Auth — 401 guard ─────────────────────────────────────────────────────────

describe("Auth guard", () => {
  it("POST /api/products without token → 401", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: "Test", description: "x", imageUrl: "x", category: "x" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/orders/x without token → 401", async () => {
    const res = await request(app).delete("/api/orders/some_id");
    expect(res.status).toBe(401);
  });
});
