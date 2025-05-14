/* global console, document */

export function showResult(textResult: string): void {
  const formulaOutput = document.getElementById("formula-output");
  if (!formulaOutput) {
    console.error("Formula output element not found");
    showError("Formula output element not found");
    return;
  }

  formulaOutput.textContent = textResult;
  const resultSection = document.getElementById("result-section");
  if (!resultSection) {
    console.error("Result section element not found");
    showError("Result section element not found");
    return;
  }
  hideErrors();
  resultSection.style.display = "block";
}

export function showError(errorText: string): void {
  const errorOutput = document.getElementById("error-output");
  if (!errorOutput) {
    console.error("Error output element not found");
    return;
  }
  
  errorOutput.textContent = `${errorText}`;
  const errorSection = document.getElementById("error-section");
  if (errorSection) {
    errorSection.style.display = "block";
  }
  hideResult();
}

export function hideResult(): void {
  const resultSection = document.getElementById("result-section");
  if (resultSection) {
    resultSection.style.display = "none";
  }
}

export function hideErrors(): void {
  const errorSection = document.getElementById("error-section");
  if (errorSection) {
    errorSection.style.display = "none";
  }
}

export function showExplanation(explanation: string): void {
  const explanationSection = document.getElementById("explanation-section");
  const formulaExplanation = document.getElementById("formula-explanation");

  if (explanationSection && formulaExplanation) {
    explanationSection.style.display = "block";
    formulaExplanation.innerHTML = explanation;
  }
}

export function getQueryInputValue(): string {
  const queryInput = document.getElementById("query-input") as HTMLTextAreaElement;
  if (!queryInput) {
    console.error("Query input element not found");
    throw new Error("Query input element not found");
  }
  return queryInput.value.trim().toLowerCase();
}

export function getFormulaOutputValue(): string | null {
  const formulaOutput = document.getElementById("formula-output");
  if (!formulaOutput || !formulaOutput.textContent) {
    return null;
  }
  return formulaOutput.textContent;
}

export function setButtonLoading(buttonId: string, loadingText: string, isLoading: boolean): void {
  const button = document.getElementById(buttonId);
  if (button) {
    if (isLoading) {
      button.innerHTML = `<span class="ms-Button-label">${loadingText}</span>`;
      button.setAttribute("disabled", "true");
    } else {
      const originalText = buttonId === "run" ? "Generate Formula" : 
                          buttonId === "explain-formula" ? "Explain Formula" : 
                          "Button";
      button.innerHTML = `<span class="ms-Button-label">${originalText}</span>`;
      button.removeAttribute("disabled");
    }
  }
}
