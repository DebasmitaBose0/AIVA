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
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ================= ROUTES =================
app.use("/api/voice", voiceRoutes);
app.get("/api/debug", (req, res) => {
  const cmdSvc = require('./services/commandService');
  const fs = require('fs');
  try {
    const local = JSON.parse(fs.readFileSync('./data/responses.json', 'utf8'));
    res.json({ keys: Object.keys(local.greetings).length });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 AIVA Backend running on port ${PORT}`);
  require('fs').writeFileSync('server_up.txt', `Running on ${PORT}`);
});
