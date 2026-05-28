import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    id:           { type: String, required: true, unique: true, default: () => `store_${Date.now()}` },
    name:         { type: String, default: "" },
    address:      { type: String, default: "" },
    phone:        { type: String, default: "" },
    email:        { type: String, default: "" },
    hours:        { type: String, default: "" },
    googleMapsUrl:{ type: String, default: "" },
  },
  { versionKey: false, timestamps: false }
);

export default model("Contact", contactSchema);
