/* global console */

const API_URL = "https://excellent-nine.vercel.app";
const API_KEY = "TEST1";

export async function generateFormulaAPI(query: string, sheetDetails: string[], currentSheet: string): Promise<{ formula: string }> {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ query, sheetDetails, currentSheet }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }

  return await response.json();
}

export async function explainFormulaAPI(formula: string): Promise<{ explanation: string }> {
  const response = await fetch(`${API_URL}/api/explain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ formula }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }

  return await response.json();
}
