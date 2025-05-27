const { generateApiKey, validateInstanceId } = require("../src/auth");
const { dbOperations } = require("../src/database");
require("dotenv").config();

module.exports = async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
};
