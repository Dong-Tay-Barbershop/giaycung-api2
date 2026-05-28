import "dotenv/config";
import express from "express";
import morgan from "morgan";
import connectDB from "./config/db";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRouter from "./routes/auth.route";
import productRouter from "./routes/product.route";
import serviceRouter from "./routes/service.route";
import newsRouter from "./routes/news.route";
import messageRouter from "./routes/message.route";
import contactRouter from "./routes/contact.route";
import orderRouter from "./routes/order.route";
import serviceOrderRouter from "./routes/serviceOrder.route";

if (process.env.NODE_ENV !== "test") {
  connectDB().catch(console.error);
}

const app = express();

app.use(corsMiddleware);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.use("/api", authRouter);
app.use("/api/products", productRouter);
app.use("/api/services", serviceRouter);
app.use("/api/news", newsRouter);
app.use("/api/messages", messageRouter);
app.use("/api/contact", contactRouter);
app.use("/api/orders", orderRouter);
app.use("/api/service-orders", serviceOrderRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
