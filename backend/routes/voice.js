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

    const result = await commandService.processCommand(command);

    if (typeof result === 'object' && result.text) {
      res.json({
        response: result.text,
        action: result.action,
        voiceName: result.voiceName,
        pendingAction: result.pendingAction
      });
    } else {
      res.json({ response: result });
    }
  } catch (error) {
    console.error("Error processing command:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
