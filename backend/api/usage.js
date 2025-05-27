const { dbOperations } = require("../src/database");
require("dotenv").config();

module.exports = async (req, res) => {
  // Only allow GET method
  if (req.method !== 'GET') {
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

    const currentUsage = await dbOperations.getCurrentMonthUsage(apiKey);
    const limit = keyInfo.tier === 'free' ? (parseInt(process.env.FREE_TIER_LIMIT) || 30) : 'unlimited';
    
    res.status(200).json({
      usage: currentUsage,
      limit: limit,
      tier: keyInfo.tier,
      remaining: keyInfo.tier === 'free' ? Math.max(0, limit - currentUsage) : 'unlimited'
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    res.status(500).json({ error: "Failed to fetch usage information" });
  }
};
