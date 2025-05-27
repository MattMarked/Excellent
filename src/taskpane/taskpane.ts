/* global console, document, Excel, Office */

// Import services
import { generateFormulaAPI, explainFormulaAPI } from "./api.service";
import { insertFormulaToActiveCell, getWorkbookSheets, getActiveSheetContent } from "./excel.service";
import { 
  showResult, 
  showError, 
  showExplanation, 
  getQueryInputValue, 
  getFormulaOutputValue,
  setButtonLoading
} from "./ui.service";
import { saveToHistory, loadFormulaHistory, clearFormulaHistory } from "./history.service";

// Authentication types
interface ApiKeyInfo {
  apiKey: string;
  tier: string;
  usage: {
    current: number;
    limit: number | string;
    remaining?: number | string;
  };
}

interface UsageInfo {
  current: number;
  limit: number | string;
  remaining: number | string;
  tier: string;
}

// Global variables for authentication
let currentApiKey: ApiKeyInfo | null = null;

Office.onReady(async (info) => {
  if (info.host === Office.HostType.Excel) {
    // Make sure these elements exist
    const sideloadMsg = document.getElementById("sideload-msg");
    const appBody = document.getElementById("app-body");
    const runButton = document.getElementById("run");

    if (sideloadMsg) sideloadMsg.style.display = "none";
    if (appBody) appBody.style.display = "flex";
    if (runButton) runButton.onclick = generateFormula;

    // Only set this if the element exists
    const insertFormulaButton = document.getElementById("insert-formula");
    if (insertFormulaButton) insertFormulaButton.onclick = insertFormula;

    const explainButton = document.getElementById("explain-formula");
    if (explainButton) explainButton.onclick = explainFormula;

    const clearHistoryButton = document.getElementById("clear-history");
    if (clearHistoryButton) clearHistoryButton.onclick = clearHistory;

    loadFormulaHistory();

    // Initialize authentication
    try {
      await initializeAuthentication();
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      showError('Failed to initialize authentication. Please try refreshing the add-in.');
    }
  }
});

/**
 * Generate a unique Office instance ID based on available Office context
 */
async function generateOfficeInstanceId(): Promise<string> {
  try {
    // Get Office context information
    const context = Office.context;
    
    // Collect various identifying information
    const components = [
      'session-' + Date.now().toString(36), // Generate a session ID since we can't access it directly
      context.platform || 'unknown-platform',
      Office.HostType[context.host] || 'unknown-host',
      'unknown-set', // Can't access requirements sets directly
      Office.context.contentLanguage || 'unknown-version',
      navigator.userAgent.substring(0, 50), // First 50 chars of user agent
      screen.width + 'x' + screen.height, // Screen resolution
      new Date().getTimezoneOffset().toString() // Timezone offset
    ];
    
    // Create a stable hash from the components
    const combined = components.join('|');
    
    // Use SubtleCrypto for hashing (available in modern browsers)
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } else {
      // Fallback to a simpler approach if crypto.subtle is not available
      return btoa(Date.now().toString() + Math.random().toString()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
  } catch (error) {
    console.error('Error generating Office instance ID:', error);
    // Fallback to a simpler approach
    return btoa(Date.now().toString() + Math.random().toString()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }
}

/**
 * Get or generate API key for the current Office instance
 */
async function getApiKey(): Promise<ApiKeyInfo> {
  try {
    // Return cached API key if available
    if (currentApiKey) {
      return currentApiKey;
    }
    
    // Generate Office instance ID
    const officeInstanceId = await generateOfficeInstanceId();
    
    // Get API base URL from your existing configuration
    const API_BASE_URL = process.env.API_URL || 'https://excellent-nine.vercel.app/api';
    
    // Request API key from backend
    const response = await fetch(`${API_BASE_URL}/generate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ officeInstanceId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to generate API key: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    
    // Cache for this session
    currentApiKey = data;
    
    return data;
  } catch (error) {
    console.error('Error getting API key:', error);
    throw error;
  }
}

/**
 * Make authenticated API requests to your backend
 */
async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Get API key
    const apiKeyInfo = await getApiKey();
    
    // Get API base URL
    const API_BASE_URL = process.env.API_URL || 'https://excellent-nine.vercel.app/api';
    
    // Add API key to headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKeyInfo.apiKey,
      ...options.headers
    };
    
    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({ error: 'Rate limit exceeded' }));
      throw new Error(`Usage limit exceeded: ${errorData.usage || 'unknown'}/${errorData.limit || 'unknown'} requests this month`);
    }
    
    return response;
  } catch (error) {
    console.error('Error making authenticated request:', error);
    throw error;
  }
}

/**
 * Get current usage information
 */
async function getUsageInfo(): Promise<UsageInfo> {
  try {
    const response = await authenticatedFetch('/usage');
    
    if (!response.ok) {
      throw new Error(`Failed to get usage info: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting usage info:', error);
    throw error;
  }
}

/**
 * Update usage display in UI
 */
function updateUsageDisplay(usage: { current: number; limit: number | string; remaining?: number | string }): void {
  let usageElement = document.getElementById('usage-info');
  
  // Create usage element if it doesn't exist
  if (!usageElement) {
    usageElement = document.createElement('div');
    usageElement.id = 'usage-info';
    usageElement.style.fontSize = '12px';
    usageElement.style.margin = '10px 0';
    usageElement.style.padding = '5px';
    usageElement.style.textAlign = 'center';
    
    // Insert at the top of the app body
    const appBody = document.getElementById('app-body');
    if (appBody && appBody.firstChild) {
      appBody.insertBefore(usageElement, appBody.firstChild);
    }
  }
  
  // Update usage text
  const limitText = typeof usage.limit === 'number' ? usage.limit.toString() : usage.limit;
  usageElement.textContent = `Usage: ${usage.current}/${limitText} requests this month`;
  
  // Change color based on remaining usage
  if (typeof usage.remaining === 'number') {
    if (usage.remaining <= 5) {
      usageElement.style.color = 'red';
      usageElement.style.backgroundColor = '#ffebee';
    } else if (usage.remaining <= 10) {
      usageElement.style.color = 'orange';
      usageElement.style.backgroundColor = '#fff3e0';
    } else {
      usageElement.style.color = 'green';
      usageElement.style.backgroundColor = '#e8f5e8';
    }
  }
}

/**
 * Initialize authentication when the add-in loads
 */
async function initializeAuthentication(): Promise<void> {
  try {
    // Pre-generate API key to make first request faster
    const apiKeyInfo = await getApiKey();
    console.log('API key initialized for tier:', apiKeyInfo.tier);
    
    // Update usage display
    updateUsageDisplay(apiKeyInfo.usage);
    
    // Optionally refresh usage info
    try {
      const usageInfo = await getUsageInfo();
      updateUsageDisplay(usageInfo);
    } catch (error) {
      console.warn('Could not fetch current usage info:', error);
    }
  } catch (error) {
    console.error('Failed to initialize API key:', error);
    throw error;
  }
}

export async function generateFormula() {
  try {
    // Get the user's query
    const query = getQueryInputValue();

    if (!query) {
      showError("Please enter a query.");
      return;
    }

    // Show loading state
    setButtonLoading("run", "Generating...", true);

    // Get sheet details
    const sheets = await getWorkbookSheets();
    const sheetDetails = sheets.map(sheet => 
      `${sheet.name} (Color: ${typeof sheet.tabColor === 'string' ? sheet.tabColor : JSON.stringify(sheet.tabColor)})`
    );
    const currentSheet = JSON.stringify(await getActiveSheetContent());

    // Make authenticated request
    const response = await authenticatedFetch('/generate', {
      method: 'POST',
      body: JSON.stringify({
        query,
        sheetDetails,
        currentSheet
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    showResult(data.formula);
    
    // Update usage display
    if (data.usage) {
      updateUsageDisplay(data.usage);
    }
    
    if (data.formula) {
      saveToHistory(query, data.formula);
      loadFormulaHistory();
    }
  } catch (error) {
    console.error("Error generating formula:", error);
    showError(error.toString());
  } finally {
    // Reset button state
    setButtonLoading("run", "Generate Formula", false);
  }
}

export async function insertFormula() {
  try {
    const formula = getFormulaOutputValue();
    if (!formula) {
      showError("No formula to insert");
      return;
    }

    await insertFormulaToActiveCell(formula);
  } catch (error) {
    console.error("Error:", error);
    showError("Error inserting formula: " + error);
  }
}

export async function explainFormula() {
  try {
    const formula = getFormulaOutputValue();
    if (!formula) {
      showError("No formula to explain");
      return;
    }

    // Show loading state
    setButtonLoading("explain-formula", "Explaining...", true);

    // Make authenticated request
    const response = await authenticatedFetch('/explain', {
      method: 'POST',
      body: JSON.stringify({ formula })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Show explanation
    showExplanation(data.explanation);
    
    // Update usage display
    if (data.usage) {
      updateUsageDisplay(data.usage);
    }
  } catch (error) {
    console.error("Error explaining formula:", error);
    showError("Error explaining formula: " + error);
  } finally {
    // Reset button state
    setButtonLoading("explain-formula", "Explain Formula", false);
  }
}

export function clearHistory() {
  clearFormulaHistory();
}
