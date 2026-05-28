import { Schema, model } from "mongoose";

const newsSchema = new Schema(
  {
    id:            { type: String, required: true, unique: true, default: () => `news_${Date.now()}` },
    title:         { type: String, required: true },
    excerpt:       { type: String, default: "" },
    content:       { type: String, default: "" },
    imageUrl:      { type: String, default: "" },
    category:      { type: String, default: "news" },
    author:        { type: String, default: "Admin" },
    publishedDate: { type: String, default: "" },  // YYYY-MM-DD
    status:        { type: String, enum: ["published", "draft"], default: "published" },
  },
  { versionKey: false, timestamps: false }
);

export default model("News", newsSchema);
