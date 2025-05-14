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

Office.onReady((info) => {
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
  }
});

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

    // Call the backend API
    const data = await generateFormulaAPI(query, (await getWorkbookSheets()).map(sheet => 
      `${sheet.name} (Color: ${typeof sheet.tabColor === 'string' ? sheet.tabColor : JSON.stringify(sheet.tabColor)})`
    ), JSON.stringify(await getActiveSheetContent()));
    
    showResult(data.formula);
    if (data.formula) {
      saveToHistory(query, data.formula);
      loadFormulaHistory();
    }
  } catch (error) {
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

    // Call the explanation API
    const data = await explainFormulaAPI(formula);

    // Show explanation
    showExplanation(data.explanation);
  } catch (error) {
    showError("Error explaining formula: " + error);
  } finally {
    // Reset button state
    setButtonLoading("explain-formula", "Explain Formula", false);
  }
}

export function clearHistory() {
  clearFormulaHistory();
}
