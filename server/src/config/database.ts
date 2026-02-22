import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'crm.db');
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: BetterSqlite3.Database = new Database(DB_PATH);

// Performance and safety pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB page cache
db.pragma('temp_store = MEMORY');

// Run migrations
function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `);

  const applied = db
    .prepare('SELECT filename FROM _migrations ORDER BY filename')
    .all() as { filename: string }[];
  const appliedSet = new Set(applied.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (!appliedSet.has(file)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
      console.log(`[DB] Applied migration: ${file}`);
    }
  }
}

runMigrations();

export default db;
