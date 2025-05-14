/* global console, document */

interface FormulaHistoryItem {
  query: string;
  formula: string;
  timestamp: number;
}

export function saveToHistory(query: string, formula: string): void {
  try {
    // Get existing history from localStorage
    const historyJson = localStorage.getItem("formulaHistory") || "[]";
    const history: FormulaHistoryItem[] = JSON.parse(historyJson);

    // Add new item
    const newItem: FormulaHistoryItem = {
      query,
      formula,
      timestamp: Date.now(),
    };

    // Add to beginning of array
    history.unshift(newItem);

    // Keep only the last 10 items
    const trimmedHistory = history.slice(0, 10);

    // Save back to localStorage
    localStorage.setItem("formulaHistory", JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Error saving to history:", error);
  }
}

export function loadFormulaHistory(): void {
  try {
    const historyContainer = document.getElementById("formula-history");
    if (!historyContainer) return;

    // Get history from localStorage
    const historyJson = localStorage.getItem("formulaHistory") || "[]";
    const history: FormulaHistoryItem[] = JSON.parse(historyJson);

    // If no history, show default message
    if (history.length === 0) {
      historyContainer.innerHTML = `
        <div class="ms-MessageBar ms-MessageBar--info">
          <div class="ms-MessageBar-content">
            <div class="ms-MessageBar-text">
              Your recently generated formulas will appear here.
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Build HTML for history items
    let historyHtml = "";
    history.forEach((item, index) => {
      historyHtml += `
        <div class="history-item" data-index="${index}">
          <div class="history-query">${truncateText(item.query, 30)}</div>
          <div class="history-formula">${truncateText(item.formula, 40)}</div>
        </div>
      `;
    });

    historyContainer.innerHTML = historyHtml;

    // Add click handlers to history items
    const historyItems = document.querySelectorAll(".history-item");
    historyItems.forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.getAttribute("data-index") || "0", 10);
        loadHistoryItem(index);
      });
    });
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

export function loadHistoryItem(index: number): void {
  try {
    // Get history from localStorage
    const historyJson = localStorage.getItem("formulaHistory") || "[]";
    const history: FormulaHistoryItem[] = JSON.parse(historyJson);

    if (index >= 0 && index < history.length) {
      const item = history[index];

      // Set query input
      const queryInput = document.getElementById("query-input") as HTMLTextAreaElement;
      if (queryInput) {
        queryInput.value = item.query;
      }

      // Set formula output
      const formulaOutput = document.getElementById("formula-output");
      if (formulaOutput) {
        formulaOutput.textContent = item.formula;
      }

      // Show result section
      const resultSection = document.getElementById("result-section");
      if (resultSection) {
        resultSection.style.display = "block";
      }

      // Hide explanation section
      const explanationSection = document.getElementById("explanation-section");
      if (explanationSection) {
        explanationSection.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error loading history item:", error);
  }
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

export function clearFormulaHistory(): void {
  try {
    // Clear history from localStorage
    localStorage.removeItem("formulaHistory");
    
    // Update the UI
    loadFormulaHistory();
  } catch (error) {
    console.error("Error clearing history:", error);
  }
}
