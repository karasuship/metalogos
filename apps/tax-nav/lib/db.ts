import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

const DATA_DIR = path.join(os.homedir(), "Documents", "tax-nav");
const DB_PATH = path.join(DATA_DIR, "data.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "receipts"), { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  initSchema(_db);
  return _db;
}

export const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      amount      INTEGER NOT NULL,
      tax_amount  INTEGER NOT NULL DEFAULT 0,
      description TEXT    NOT NULL,
      category_id TEXT    NOT NULL,
      vendor      TEXT,
      invoice_no  TEXT,
      invoice_valid INTEGER DEFAULT NULL,
      receipt_path TEXT,
      note        TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS bank_imports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      amount      INTEGER NOT NULL,
      description TEXT    NOT NULL,
      transaction_id INTEGER REFERENCES transactions(id),
      imported_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  // デフォルト設定
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  insertSetting.run("home_ratio", "20");       // 自宅按分率（%）
  insertSetting.run("phone_ratio", "50");      // 通信費按分率（%）
  insertSetting.run("dependent_type", "none"); // 扶養区分
  insertSetting.run("fiscal_year", new Date().getFullYear().toString());
}
