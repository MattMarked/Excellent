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
  }
});

export function generateFormula() {
  try {
    // Get the user's query
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

    // For now, just return mock formulas based on keywords in the query
    let generatedFormula = "";
    
    if (query.toLowerCase().includes("sum") && query.toLowerCase().includes("region")) {
      generatedFormula = '=SUMIFS(C2:C100, A2:A100, "North")';
    } else if (query.toLowerCase().includes("average") || query.toLowerCase().includes("avg")) {
      generatedFormula = '=AVERAGE(B2:B100)';
    } else if (query.toLowerCase().includes("count")) {
      generatedFormula = '=COUNTIF(A2:A100, "Value")';
    } else {
      generatedFormula = '=SUM(A1:A10)';
    }

    // Display the result
    const formulaOutput = document.getElementById("formula-output");
    if (!formulaOutput) {
      console.error("Formula output element not found");
      return;
    }
    
    formulaOutput.textContent = generatedFormula;
    
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