const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create API keys table
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_instance_id TEXT UNIQUE NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating api_keys table:', err.message);
    }
  });

  // Create usage tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      request_count INTEGER DEFAULT 0,
      last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_key) REFERENCES api_keys (api_key),
      UNIQUE(api_key, year, month)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating usage_tracking table:', err.message);
    }
  });
}

// Database operations
const dbOperations = {
  // Store API key
  storeApiKey: (officeInstanceId, apiKey, tier = 'free') => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO api_keys (office_instance_id, api_key, tier) VALUES (?, ?, ?)',
        [officeInstanceId, apiKey, tier],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  },

  // Get API key info
  getApiKeyInfo: (apiKey) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM api_keys WHERE api_key = ?',
        [apiKey],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  },

  // Get API key by office instance ID
  getApiKeyByInstanceId: (officeInstanceId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM api_keys WHERE office_instance_id = ?',
        [officeInstanceId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  },

  // Track usage
  trackUsage: (apiKey) => {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed

      db.run(
        `INSERT INTO usage_tracking (api_key, year, month, request_count, last_request) 
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(api_key, year, month) 
         DO UPDATE SET request_count = request_count + 1, last_request = CURRENT_TIMESTAMP`,
        [apiKey, year, month],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  },

  // Get current month usage
  getCurrentMonthUsage: (apiKey) => {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      db.get(
        'SELECT request_count FROM usage_tracking WHERE api_key = ? AND year = ? AND month = ?',
        [apiKey, year, month],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.request_count : 0);
          }
        }
      );
    });
  }
};

module.exports = { db, dbOperations };