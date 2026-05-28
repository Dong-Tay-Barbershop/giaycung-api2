import "dotenv/config";
import app from "@/app";
import connectDB from "@/config/db";

const PORT = parseInt(process.env.PORT || "3000", 10);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
