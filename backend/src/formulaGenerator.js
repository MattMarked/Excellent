const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a formula based on the user's query using OpenAI.
 */
async function generateFormula(query) {
  try {
    const prompt = `
You are an Excel formula expert. Create the most appropriate Excel formula for the following request:
"${query}"

Provide ONLY the Excel formula with no additional text or explanation.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Lower temperature for more deterministic outputs
      max_tokens: 150,
    });

    // Extract the formula from the response
    let formula = response.choices[0].message.content.trim();
    
    // Ensure it starts with '='
    if (!formula.startsWith('=')) {
      formula = '=' + formula;
    }
    
    return formula;
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to simple formula generation if API fails
    return fallbackGenerateFormula(query);
  }
}

async function explainFormula(formula) {
  try {
    const prompt = `
Explain the following Excel formula in simple terms, breaking down each part:
"${formula}"

Your explanation should be concise but clear, suitable for users with basic Excel knowledge.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 250,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Provide a generic explanation if API fails
    return `This formula ${formula} performs a calculation in Excel. Due to a temporary issue, a detailed explanation is not available.`;
  }
}

/**
 * Fallback formula generator if the API call fails.
 */
function fallbackGenerateFormula(query) {
  query = query.toLowerCase();
  
  if (query.includes('sum') && query.includes('region')) {
    return '=SUMIFS(C2:C100, A2:A100, "North")';
  } else if (query.includes('average') || query.includes('avg')) {
    return '=AVERAGE(B2:B100)';
  } else if (query.includes('count')) {
    return '=COUNTIF(A2:A100, "Value")';
  } else {
    return '=SUM(A1:A10)';
  }
}

module.exports = {
  generateFormula,
  explainFormula
};