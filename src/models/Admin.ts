import { Schema, model } from "mongoose";

const adminSchema = new Schema(
  {
    email:        { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, default: "admin" },
  },
  { versionKey: false, timestamps: false }
);

export default model("Admin", adminSchema);
