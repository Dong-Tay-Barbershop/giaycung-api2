import { Schema, model } from "mongoose";

const serviceSchema = new Schema(
  {
    id:          { type: String, required: true, unique: true, default: () => `srv_${Date.now()}` },
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    price:       { type: String, default: "" },   // flexible: "150.000đ", "Liên hệ"
    duration:    { type: String, default: "" },
    imageUrl:    { type: String, default: "" },
    features:    { type: String, default: "" },
    status:      { type: String, enum: ["published", "draft"], default: "published" },
  },
  { versionKey: false, timestamps: false }
);

export default model("Service", serviceSchema);
