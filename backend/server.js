require("dotenv").config();
const express = require("express");
const cors = require("cors");

const voiceRoutes = require("./routes/voice");

const app = express();

// 🔒 SINGLE SOURCE OF TRUTH FOR PORT
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
  credentials: true
}));
app.use(express.json());

// ================= ROUTES =================
app.use("/api/voice", voiceRoutes);

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 AIVA Backend running on port ${PORT}`);
});
