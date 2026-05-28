import "dotenv/config";
import app from "./src/app";
import connectDB from "./src/config/db";

const PORT = parseInt(process.env.PORT || "3000", 10);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
