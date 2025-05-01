/* global console, document, Excel, Office */

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
  }
});

export async function generateFormula() {
  try {
    // Get the user's query
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    const queryInput = document.getElementById("query-input") as HTMLTextAreaElement;
    if (!queryInput) {
      console.error("Query input element not found");
      return;
    }
    
    const query = queryInput.value.trim();
    
    if (!query) {
      alert("Please enter a query.");
      return;
    }

    // Show loading state
    const runButton = document.getElementById("run");
    if (runButton) {
      runButton.innerHTML = '<span class="ms-Button-label">Generating...</span>';
      runButton.setAttribute("disabled", "true");
    }
    
    // Call the backend API
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Display the result
    const formulaOutput = document.getElementById("formula-output");
    if (!formulaOutput) {
      console.error("Formula output element not found");
      return;
    }
    
    formulaOutput.textContent = data.formula;
    
    // Show the result section
    const resultSection = document.getElementById("result-section");
    if (!resultSection) {
      console.error("Result section element not found");
      return;
    }
    resultSection.style.display = "block";
  } catch (error) {
    console.error("Error:", error);
    alert("Error generating formula: " + error);
  } finally {
    // Reset button state
    const runButton = document.getElementById("run");
    if (runButton) {
      runButton.innerHTML = '<span class="ms-Button-label">Generate Formula</span>';
      runButton.removeAttribute("disabled");
    }
  }
}

export async function insertFormula() {
  try {
    const formulaOutput = document.getElementById("formula-output");
    if (!formulaOutput || !formulaOutput.textContent) {
      alert("No formula to insert");
      return;
    }
    
    await Excel.run(async (context) => {
      const formula = formulaOutput.textContent;
      
      // Get the current active cell
      const range = context.workbook.getActiveCell();
      
      // Set the formula
      range.formulas = [[formula]];
      
      await context.sync();
    });
  } catch (error) {
    console.error("Error:", error);
    alert("Error inserting formula: " + error);
  }
}

export async function explainFormula() {
  try {
    const formulaOutput = document.getElementById("formula-output");
    if (!formulaOutput || !formulaOutput.textContent) {
      alert("No formula to explain");
      return;
    }
    
    const formula = formulaOutput.textContent;
    
    // Show loading state
    const explainButton = document.getElementById("explain-formula");
    if (explainButton) {
      explainButton.innerHTML = '<span class="ms-Button-label">Explaining...</span>';
      explainButton.setAttribute("disabled", "true");
    }
    
    // Call the explanation API
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    const response = await fetch(`${API_URL}/api/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formula }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Show explanation
    const explanationSection = document.getElementById("explanation-section");
    const formulaExplanation = document.getElementById("formula-explanation");
    
    if (explanationSection && formulaExplanation) {
      explanationSection.style.display = "block";
      formulaExplanation.innerHTML = data.explanation;
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error explaining formula: " + error);
  } finally {
    // Reset button state
    const explainButton = document.getElementById("explain-formula");
    if (explainButton) {
      explainButton.innerHTML = '<span class="ms-Button-label">Explain Formula</span>';
      explainButton.removeAttribute("disabled");
    }
  }}