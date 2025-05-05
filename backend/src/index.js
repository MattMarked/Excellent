const express = require("express");
const cors = require("cors");
const { generateFormula } = require("./formulaGenerator");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Formula generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Generate formula using OpenAI
    const formula = await generateFormula(query);
    res.status(200).json({ formula });
  } catch (error) {
    console.error("Error generating formula:", error);
    res.status(500).json({ error: "Failed to generate formula" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.post("/api/explain", async (req, res) => {
  try {
    const { formula } = req.body;

    if (!formula) {
      return res.status(400).json({ error: "Formula is required" });
    }

    // Generate explanation
    const explanation = await explainFormula(formula);
    res.status(200).json({ explanation });
  } catch (error) {
    console.error("Error explaining formula:", error);
    res.status(500).json({ error: "Failed to explain formula" });
  }
});
