import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    id:        { type: String, required: true, unique: true, default: () => `msg_${Date.now()}` },
    createdAt: { type: Date, default: Date.now },
    fullName:  { type: String, default: "" },
    phone:     { type: String, default: "" },
    email:     { type: String, default: "" },
    message:   { type: String, default: "" },
    status:    { type: String, default: "new" },
    source:    { type: String, default: "contact-page" },
  },
  { versionKey: false, timestamps: false }
);

export default model("Message", messageSchema);
