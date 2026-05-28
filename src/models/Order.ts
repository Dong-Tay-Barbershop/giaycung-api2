import { Schema, model } from "mongoose";
import crypto from "crypto";

const orderItemSchema = new Schema(
  {
    productId:   { type: String, default: "" },
    productName: { type: String, required: true },
    quantity:    { type: Number, required: true, default: 1, min: 1 },
    price:       { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false, versionKey: false }
);

const orderSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `ORD-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    },
    customerName:    { type: String, required: true },
    customerPhone:   { type: String, required: true },
    customerAddress: { type: String, default: "" },
    notes:           { type: String, default: "" },
    totalAmount:     { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    items:     { type: [orderItemSchema], default: [] },
  },
  { versionKey: false, timestamps: false }
);

export default model("Order", orderSchema);
