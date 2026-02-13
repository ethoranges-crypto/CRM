import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "@/db/schema"

// In Electron production builds, CRM_DB_PATH points to userData/crm.db
// In dev or plain Next.js, falls back to relative "crm.db"
const dbPath = process.env.CRM_DB_PATH || "crm.db"

const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

export const db = drizzle(sqlite, { schema })
