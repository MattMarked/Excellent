const express = require('express');
const cors = require('cors');
const { generateFormula } = require('./formulaGenerator');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Formula generation endpoint
app.post('/api/generate', (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // For now, just return mock formulas based on keywords
    const formula = generateFormula(query);
    res.status(200).json({ formula });
  } catch (error) {
    console.error('Error generating formula:', error);
    res.status(500).json({ error: 'Failed to generate formula' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});