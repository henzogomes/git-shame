import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

// Define the shape of our cached responses
export interface CachedShame {
  id: number;
  username: string;
  language: string;
  shame_text: string;
  created_at: string;
}

let db: Database | null = null;

// Initialize the database connection
export async function getDb(): Promise<Database> {
  if (db) return db;

  // Ensure we open the DB in a persistent location that works with Next.js in all environments
  const dbPath = path.resolve(process.cwd(), "data", "shame.db");

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create our table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cached_shames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      language TEXT NOT NULL,
      shame_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(username, language)
    )
  `);

  return db;
}

// Get a cached shame if it exists and is not too old
export async function getCachedShame(
  username: string,
  language: string
): Promise<CachedShame | null> {
  const db = await getDb();

  // Get cached data that's less than 24 hours old
  const cachedShame = await db.get<CachedShame>(
    `SELECT * FROM cached_shames
     WHERE username = ? AND language = ?
     AND datetime(created_at) > datetime('now', '-24 hours')`,
    [username, language]
  );

  // Explicitly return null if the result is undefined
  return cachedShame || null;
}

// Store a shame result in the cache
export async function cacheShame(
  username: string,
  language: string,
  shameText: string
): Promise<void> {
  const db = await getDb();

  // Replace any existing entries for this username/language combo
  await db.run(
    `INSERT OR REPLACE INTO cached_shames (username, language, shame_text)
     VALUES (?, ?, ?)`,
    [username, language, shameText]
  );
}
