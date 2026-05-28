import { Schema, model } from "mongoose";

const shoeSchema = new Schema(
  {
    id:      { type: String, required: true, default: () => `shoe_${Date.now()}` },
    name:    { type: String, required: true },
    service: { type: String, required: true },
    status: {
      type: String,
      enum: ["received", "processing", "completed"],
      default: "received",
    },
    images:  { type: [String], default: [] },
    notes:   { type: String, default: "" },
    deleted: { type: Boolean, default: false },
  },
  { _id: false, versionKey: false }
);

const serviceOrderSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `ord_${Date.now()}`,
    },
    orderNumber:   { type: String, required: true, unique: true },  // ORD-001
    customerName:  { type: String, required: true },
    customerPhone: { type: String, required: true },
    createdDate:   { type: String, default: () => new Date().toISOString().slice(0, 10) },  // YYYY-MM-DD
    totalAmount:   { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    assignedTo: { type: String, default: "" },
    shoes:      { type: [shoeSchema], default: [] },
  },
  { versionKey: false, timestamps: false }
);

export default model("ServiceOrder", serviceOrderSchema);
