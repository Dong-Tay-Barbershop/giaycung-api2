import mongoose from "mongoose";

// Cache connection across serverless invocations (Vercel)
let isConnected = false;

async function connectDB(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");

  await mongoose.connect(uri);
  isConnected = true;
  console.log("MongoDB connected");
}

export default connectDB;
