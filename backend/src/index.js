const express = require("express");
const cors = require("cors");
require("dotenv").config();

// This file is kept as a fallback and for local development
// All API endpoints are now handled by dedicated files in the /api directory

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: [
    'https://excellent-nine.vercel.app', 
    'https://excellent-nine.vercel.app/',
    'https://MattMarked.github.io'
  ],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Fallback route
app.all("*", (req, res) => {
  res.status(404).json({ 
    error: "Not Found", 
    message: "This endpoint is not available. Please check the API documentation." 
  });
});

// Only used for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
