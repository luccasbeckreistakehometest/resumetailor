import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
let db: Database.Database | null = null;

/** Single SQLite file on the server's disk. WAL so webhooks can write while pages read. */
export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(path.join(DATA_DIR, "resumetailor.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}_${randomBytes(10).toString("hex")}`;

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',          -- 'user' | 'admin'
      credits INTEGER NOT NULL DEFAULT 0,
      lang TEXT NOT NULL DEFAULT 'en',
      createdAt TEXT NOT NULL,
      lastSeenAt TEXT
    );

    -- Every credit movement, so a balance can always be reconstructed and audited.
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,                        -- signup_bonus | purchase | unlock | admin_grant
      ref TEXT,
      balanceAfter INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(userId, createdAt);

    -- A kit the AI produced. Anonymous visitors own rows through a cookie until they sign up.
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      anonId TEXT,
      mode TEXT NOT NULL,                          -- tailor | improve | build
      source TEXT NOT NULL DEFAULT 'text',         -- text | voice
      lang TEXT NOT NULL DEFAULT 'en',
      title TEXT NOT NULL DEFAULT '',
      targetRole TEXT NOT NULL DEFAULT '',
      input TEXT NOT NULL,
      result TEXT NOT NULL,
      matchBefore INTEGER NOT NULL DEFAULT 0,
      matchAfter INTEGER NOT NULL DEFAULT 0,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlockedAt TEXT,
      model TEXT NOT NULL DEFAULT '',
      costUsd REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gen_user ON generations(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_gen_anon ON generations(anonId, createdAt DESC);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,                      -- stripe | mercadopago
      externalId TEXT NOT NULL,                    -- the idempotency key
      pack TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected
      createdAt TEXT NOT NULL,
      settledAt TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external ON payments(provider, externalId);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(userId, createdAt DESC);

    -- The guided tour and what a person did in their first session, kept so it can be replayed.
    CREATE TABLE IF NOT EXISTS onboarding (
      id TEXT PRIMARY KEY,                         -- userId or anonId
      tourCompleted INTEGER NOT NULL DEFAULT 0,
      tourStep INTEGER NOT NULL DEFAULT 0,
      firstSeenAt TEXT NOT NULL,
      completedAt TEXT,
      events TEXT NOT NULL DEFAULT '[]'
    );

    -- Raw transcripts of voice briefings and what was extracted, for quality review.
    CREATE TABLE IF NOT EXISTS voice_briefings (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      lang TEXT NOT NULL,
      transcript TEXT NOT NULL,
      extracted TEXT NOT NULL,
      generationId TEXT,
      createdAt TEXT NOT NULL
    );
  `);
}
