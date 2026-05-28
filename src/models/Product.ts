import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    id:          { type: String, required: true, unique: true, default: () => `prd_${Date.now()}` },
    name:        { type: String, required: true },
    description: { type: String, default: "" },
    price:       { type: Number, default: 0 },
    imageUrl:    { type: String, default: "" },
    category:    { type: String, default: "" },
    stock:       { type: Number, default: 0 },
    rating:      { type: Number, default: 0 },
    status:      { type: String, enum: ["published", "draft"], default: "published" },
  },
  { versionKey: false, timestamps: false }
);

export default model("Product", productSchema);
