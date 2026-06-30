import "dotenv/config";
import express from "express";
import morgan from "morgan";
import connectDB from "./config/db";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRouter from "./routes/auth.route";
import adminRouter from "./routes/admin.route";
import productRouter from "./routes/product.route";
import serviceRouter from "./routes/service.route";
import newsRouter from "./routes/news.route";
import messageRouter from "./routes/message.route";
import contactRouter from "./routes/contact.route";
import orderRouter from "./routes/order.route";
import serviceOrderRouter from "./routes/serviceOrder.route";
import vietqrRouter from "./routes/vietqr.route";

const app = express();

app.use(corsMiddleware);
app.use(morgan("dev"));
// VietQR callback routes mount their own JSON parser with a tighter limit.
app.use((req, res, next) => {
  if (req.path.startsWith("/vqr/")) return next();
  return express.json({ limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith("/vqr/")) return next();
  return express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});

// Ensure DB connected before any route handler runs (serverless cold start safe)
if (process.env.NODE_ENV !== "test") {
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      next(err);
    }
  });
}

// Health check
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, message: "pong" });
});

app.use("/api", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productRouter);
app.use("/api/services", serviceRouter);
app.use("/api/news", newsRouter);
app.use("/api/messages", messageRouter);
app.use("/api/contact", contactRouter);
app.use("/api/orders", orderRouter);
app.use("/api/service-orders", serviceOrderRouter);
app.use("/vqr", vietqrRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
