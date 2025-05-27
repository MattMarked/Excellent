const express = require("express");
const cors = require("cors");
const { generateFormula, explainFormula } = require("./formulaGenerator");
const { dbOperations } = require("./database");
const { generateApiKey, validateInstanceId } = require("./auth");
require("dotenv").config();

// Enhanced middleware to validate API key and track usage
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  // Skip validation for health check and key generation
  if (req.path === "/health" || req.path === "/generate-key") {
    return next();
  }

  // Check if API key is missing
  if (!apiKey) {
    return res.status(401).json({ error: "API key is required" });
  }

  try {
    // Get API key info from database
    const keyInfo = await dbOperations.getApiKeyInfo(apiKey);
    
    if (!keyInfo) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // Check usage limits for free tier
    if (keyInfo.tier === 'free') {
      const currentUsage = await dbOperations.getCurrentMonthUsage(apiKey);
      const limit = parseInt(process.env.FREE_TIER_LIMIT) || 30;
      
      if (currentUsage >= limit) {
        return res.status(429).json({ 
          error: "Monthly usage limit exceeded",
          limit: limit,
          usage: currentUsage
        });
      }
    }

    // Track this request
    await dbOperations.trackUsage(apiKey);
    
    // Add key info to request for potential use in endpoints
    req.keyInfo = keyInfo;
    
    next();
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: [
    'https://excellent-nine.vercel.app', 
    'https://excellent-nine.vercel.app/',
    'https://MattMarked.github.io'
  ],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(validateApiKey);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// API key generation endpoint
app.post("/generate-key", async (req, res) => {
  try {
    const { officeInstanceId } = req.body;

    if (!officeInstanceId) {
      return res.status(400).json({ error: "Office instance ID is required" });
    }

    // Validate instance ID format
    if (!validateInstanceId(officeInstanceId)) {
      return res.status(400).json({ error: "Invalid office instance ID format" });
    }

    // Check if API key already exists for this instance
    const existingKey = await dbOperations.getApiKeyByInstanceId(officeInstanceId);
    
    if (existingKey) {
      // Return existing key
      const currentUsage = await dbOperations.getCurrentMonthUsage(existingKey.api_key);
      return res.status(200).json({ 
        apiKey: existingKey.api_key,
        tier: existingKey.tier,
        usage: {
          current: currentUsage,
          limit: existingKey.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited'
        }
      });
    }

    // Generate new API key
    const apiKey = generateApiKey(officeInstanceId);
    
    // Store in database
    await dbOperations.storeApiKey(officeInstanceId, apiKey, 'free');
    
    res.status(201).json({ 
      apiKey: apiKey,
      tier: 'free',
      usage: {
        current: 0,
        limit: parseInt(process.env.FREE_TIER_LIMIT) || 30
      }
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

// Get usage information
app.get("/usage", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const currentUsage = await dbOperations.getCurrentMonthUsage(apiKey);
    const limit = req.keyInfo.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited';
    
    res.status(200).json({
      usage: currentUsage,
      limit: limit,
      tier: req.keyInfo.tier,
      remaining: req.keyInfo.tier === 'free' ? Math.max(0, limit - currentUsage) : 'unlimited'
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    res.status(500).json({ error: "Failed to fetch usage information" });
  }
});

// Formula generation endpoint
app.post("/generate", async (req, res) => {
  try {
    const { query, sheetDetails, currentSheet } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Generate formula using OpenAI with additional context
    const formula = await generateFormula(query, sheetDetails, currentSheet);
    
    // Include usage information in response
    const currentUsage = await dbOperations.getCurrentMonthUsage(req.headers["x-api-key"]);
    const limit = req.keyInfo.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited';
    
    res.status(200).json({ 
      formula,
      usage: {
        current: currentUsage,
        limit: limit,
        remaining: req.keyInfo.tier === 'free' ? Math.max(0, limit - currentUsage) : 'unlimited'
      }
    });
  } catch (error) {
    console.error("Error generating formula:", error);
    res.status(500).json({ error: "Failed to generate formula" });
  }
});

// Formula explanation endpoint
app.post("/explain", async (req, res) => {
  try {
    const { formula } = req.body;

    if (!formula) {
      return res.status(400).json({ error: "Formula is required" });
    }

    // Generate explanation
    const explanation = await explainFormula(formula);
    
    // Include usage information in response
    const currentUsage = await dbOperations.getCurrentMonthUsage(req.headers["x-api-key"]);
    const limit = req.keyInfo.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited';
    
    res.status(200).json({ 
      explanation,
      usage: {
        current: currentUsage,
        limit: limit,
        remaining: req.keyInfo.tier === 'free' ? Math.max(0, limit - currentUsage) : 'unlimited'
      }
    });
  } catch (error) {
    console.error("Error explaining formula:", error);
    res.status(500).json({ error: "Failed to explain formula" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
