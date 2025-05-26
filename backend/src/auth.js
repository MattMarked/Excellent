const crypto = require('crypto');
require('dotenv').config();

/**
 * Generate a deterministic API key based on Office instance ID and salt
 * @param {string} officeInstanceId - Unique Office instance identifier
 * @returns {string} Generated API key
 */
function generateApiKey(officeInstanceId) {
  const salt = process.env.API_KEY_SALT || 'default-salt-change-this';
  
  // Create a hash using SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(officeInstanceId + salt);
  
  // Generate a 32-character API key
  const apiKey = hash.digest('hex').substring(0, 32);
  
  return `ex_${apiKey}`;
}

/**
 * Validate Office instance ID format
 * @param {string} instanceId - Office instance ID to validate
 * @returns {boolean} True if valid format
 */
function validateInstanceId(instanceId) {
  // Basic validation - should be a non-empty string with reasonable length
  return typeof instanceId === 'string' && 
         instanceId.length >= 10 && 
         instanceId.length <= 200 &&
         /^[a-zA-Z0-9\-_]+$/.test(instanceId);
}

/**
 * Create a unique Office instance ID from available Office context
 * This function would be used on the frontend
 * @param {Object} officeContext - Office context object
 * @returns {string} Unique instance identifier
 */
function createOfficeInstanceId(officeContext) {
  // This is a template for the frontend implementation
  // Combine multiple Office context properties for uniqueness
  const components = [
    officeContext.host?.sessionId || 'unknown-session',
    officeContext.platform || 'unknown-platform',
    officeContext.host?.type || 'unknown-host',
    officeContext.requirements?.sets?.[0]?.name || 'unknown-set',
    // Add timestamp to ensure some uniqueness even if other components are similar
    Date.now().toString()
  ];
  
  // Create a hash of the combined components
  const combined = components.join('|');
  const hash = crypto.createHash('sha256');
  hash.update(combined);
  
  return hash.digest('hex');
}

module.exports = {
  generateApiKey,
  validateInstanceId,
  createOfficeInstanceId
};