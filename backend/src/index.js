const express = require("express");
const cors = require("cors");
const { generateFormula, explainFormula } = require("./formulaGenerator");
require("dotenv").config();

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  // Skip validation for health check
  if (req.path === "/api/health") {
    return next();
  }

  // Check if API key is missing
  if (!apiKey) {
    return res.status(401).json({ error: "API key is required" });
  }

  // In a real application, you would check the API key against a database
  // For now, we'll use a simple check against environment variables
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(",") : [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(validateApiKey);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Formula generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { query, sheetDetails, currentSheet } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Generate formula using OpenAI with additional context
    const formula = await generateFormula(query, sheetDetails, currentSheet);
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
