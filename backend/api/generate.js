const { generateFormula } = require("../src/formulaGenerator");
const { dbOperations } = require("../src/database");
require("dotenv").config();

module.exports = async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-api-key"];

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

    const { query, sheetDetails, currentSheet } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Generate formula using OpenAI with additional context
    const formula = await generateFormula(query, sheetDetails, currentSheet);
    
    // Include usage information in response
    const currentUsage = await dbOperations.getCurrentMonthUsage(apiKey);
    const limit = keyInfo.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited';
    
    res.status(200).json({ 
      formula,
      usage: {
        current: currentUsage,
        limit: limit,
        remaining: keyInfo.tier === 'free' ? Math.max(0, limit - currentUsage) : 'unlimited'
      }
    });
  } catch (error) {
    console.error("Error generating formula:", error);
    res.status(500).json({ error: "Failed to generate formula" });
  }
};
