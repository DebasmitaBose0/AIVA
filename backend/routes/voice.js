const express = require("express");
const router = express.Router();
const commandService = require("../services/commandService");
const auth = require("../middleware/auth");

// POST /api/voice
router.post("/", auth, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: "No command provided" });
    }

    const response = await commandService.processCommand(command);
    res.json({ response });
  } catch (error) {
    console.error("Error processing command:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
