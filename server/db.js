const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
  path.join(__dirname, "mvp.db")
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    personal_data_consent INTEGER NOT NULL DEFAULT 0,
    privacy_consent INTEGER NOT NULL DEFAULT 0,
    ai_consent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY,
    goals TEXT NOT NULL DEFAULT '[]',
    thoughts TEXT NOT NULL DEFAULT '[]',
    food_entries TEXT NOT NULL DEFAULT '[]',
    movements TEXT NOT NULL DEFAULT '[]',
    chat_history TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

module.exports = db;