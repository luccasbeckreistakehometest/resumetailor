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
  const d = new Database(path.join(DATA_DIR, "resumetailor.db"));
  // `next build` loads route modules in parallel workers against the same file: writers wait
  // for each other instead of failing with SQLITE_BUSY.
  d.pragma("busy_timeout = 5000");
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  migrate(d);
  db = d;
  return d;
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
      deepened INTEGER NOT NULL DEFAULT 0,         -- how many "go deeper" passes replaced the kit
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

    -- A mock interview run against one kit: the questions asked, every answer with its scores,
    -- and the closing summary. Anonymous visitors own rows through the cookie, like generations.
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      anonId TEXT,
      generationId TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      lang TEXT NOT NULL DEFAULT 'en',
      mode TEXT NOT NULL DEFAULT 'full',           -- full | preview (locked kit: two questions)
      status TEXT NOT NULL DEFAULT 'active',       -- active | done
      questions TEXT NOT NULL,                     -- JSON [{ kind, text }]
      turns TEXT NOT NULL DEFAULT '[]',            -- JSON [{ questionIdx, answer, source, scores, coaching, modelAnswer, at }]
      summary TEXT,                                -- JSON { rehearse, overall } once finished
      model TEXT NOT NULL DEFAULT '',
      costUsd REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_interview_anon ON interview_sessions(anonId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_interview_gen ON interview_sessions(generationId, createdAt DESC);

    -- The application tracker: one row per job, its stage, and the first date it reached each
    -- milestone (so the funnel still counts an interview after the card moves to rejected).
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      anonId TEXT,
      generationId TEXT REFERENCES generations(id) ON DELETE SET NULL,
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'saved',         -- saved | applied | interview | offer | rejected
      notes TEXT NOT NULL DEFAULT '',
      nextStepAt TEXT,                             -- YYYY-MM-DD
      appliedAt TEXT,
      interviewAt TEXT,
      offerAt TEXT,
      rejectedAt TEXT,
      stageChangedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_app_user ON applications(userId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_app_anon ON applications(anonId, updatedAt DESC);

    -- The free "am I a fit?" pre-check. One row per distinct (posting, résumé, language), shared by
    -- everyone who pastes the same pair; the owner key is who first paid for the AI call, for the daily cap.
    CREATE TABLE IF NOT EXISTS fit_checks (
      id TEXT PRIMARY KEY,
      ownerKey TEXT NOT NULL,                      -- userId or anonId of the first requester
      hash TEXT NOT NULL UNIQUE,
      lang TEXT NOT NULL DEFAULT 'en',
      role TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL,                        -- JSON FitAnalysis (no résumé or posting text is kept)
      model TEXT NOT NULL DEFAULT '',
      costUsd REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fit_owner ON fit_checks(ownerKey, createdAt DESC);

    -- A kit published as a web résumé at /cv/[slug]. One per kit; the slug never changes. Only an
    -- account can publish (unlocking needs one), and the row goes with the kit when it is deleted.
    CREATE TABLE IF NOT EXISTS public_resumes (
      id TEXT PRIMARY KEY,
      generationId TEXT NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      template TEXT NOT NULL DEFAULT 'modern',
      pinHash TEXT,                                -- scrypt, like passwords; NULL = open
      hideContact INTEGER NOT NULL DEFAULT 0,
      indexable INTEGER NOT NULL DEFAULT 0,        -- noindex unless the owner opts in
      views INTEGER NOT NULL DEFAULT 0,
      lastViewedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_user ON public_resumes(userId, updatedAt DESC);

    -- Texts grown from an unlocked kit (cover letter in another tone, recruiter emails, the
    -- LinkedIn pass): one cached row per kit + kind, cleared when the kit itself is rewritten.
    CREATE TABLE IF NOT EXISTS kit_variants (
      id TEXT PRIMARY KEY,
      generationId TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,                          -- cover:<tone> | email:<moment> | linkedin
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,                          -- text, or JSON for structured kinds
      model TEXT NOT NULL DEFAULT '',
      costUsd REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE(generationId, kind)
    );
  `);
  d.exec(LAUNCH_TABLES);
  d.exec(ROUND3_TABLES);
  addColumnIfMissing(d, "generations", "deepened", "INTEGER NOT NULL DEFAULT 0");
  // Accounts: session revocation, disabling, consent, and where the signup came from (bonus cap).
  addColumnIfMissing(d, "users", "sessionVersion", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(d, "users", "disabledAt", "TEXT");
  addColumnIfMissing(d, "users", "termsAcceptedAt", "TEXT");
  addColumnIfMissing(d, "users", "termsVersion", "TEXT");
  addColumnIfMissing(d, "users", "signupIp", "TEXT");
  addColumnIfMissing(d, "users", "mustChangePassword", "INTEGER NOT NULL DEFAULT 0");
  // Payments: the provider's own reference (Stripe payment intent) and credits taken back on refunds.
  addColumnIfMissing(d, "payments", "providerRef", "TEXT");
  addColumnIfMissing(d, "payments", "reversedCredits", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(d, "payments", "reversedAt", "TEXT");
  // Moderation: a page the admin took down stays down, whatever the owner toggles.
  addColumnIfMissing(d, "public_resumes", "takenDownAt", "TEXT");
  // ...and on the kit itself, so deleting the page and publishing again cannot undo a takedown.
  addColumnIfMissing(d, "generations", "publishBlockedAt", "TEXT");
  // Round 3: truth-check confirmations ("that's right, it's mine") per kit.
  addColumnIfMissing(d, "generations", "truthAck", "TEXT NOT NULL DEFAULT '[]'");
  // How many "missing numbers" rounds a kit used (capped by KIT_QUANTIFY_MAX).
  addColumnIfMissing(d, "generations", "quantified", "INTEGER NOT NULL DEFAULT 0");
  // Spoken turns per briefing (capped by VOICE_MAX_TURNS).
  addColumnIfMissing(d, "voice_briefings", "turns", "INTEGER NOT NULL DEFAULT 1");
  d.exec("CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(provider, providerRef)");
  d.exec("CREATE INDEX IF NOT EXISTS idx_users_signup_ip ON users(signupIp, createdAt)");
}

/** Round 3: saved profile, résumé versions, analytics, pitch takes, job imports, vouchers, referrals. */
const ROUND3_TABLES = `
  -- The candidate's base résumé and the facts they told us (voice, number answers), reused for
  -- every new kit. Owned by the account, or by the visitor cookie until signup.
  CREATE TABLE IF NOT EXISTS career_profiles (
    ownerKey TEXT PRIMARY KEY,
    resume TEXT NOT NULL DEFAULT '',
    facts TEXT NOT NULL DEFAULT '{}',
    roles TEXT NOT NULL DEFAULT '[]',
    updatedAt TEXT NOT NULL
  );

  -- Every version of a kit's résumé: the AI's, each deepening or number pass, the person's edits
  -- (consecutive autosaves coalesce) and restores. The first row is the AI original and is kept.
  CREATE TABLE IF NOT EXISTS resume_versions (
    id TEXT PRIMARY KEY,
    generationId TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    source TEXT NOT NULL,                        -- ai | deepen | quantify | user | restore
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_versions_gen ON resume_versions(generationId, createdAt);
`;

const LAUNCH_TABLES = `
  -- Small key/value store for operational state (admin password fingerprint, AI health).
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  -- Fixed-window counters for rate limits and lockouts. Rows expire; old ones are swept.
  CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT NOT NULL,
    key TEXT NOT NULL,
    windowStart INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    expiresAt INTEGER NOT NULL,
    PRIMARY KEY (bucket, key, windowStart)
  );
  CREATE INDEX IF NOT EXISTS idx_rate_expires ON rate_limits(expiresAt);

  -- Every AI call (and TTS synthesis) with its cost, so the daily spend ceiling and the admin
  -- panel work from recorded numbers. Failures are kept with the operator-facing detail.
  CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    feature TEXT NOT NULL,
    ownerKey TEXT,
    ip TEXT,
    model TEXT NOT NULL DEFAULT '',
    costUsd REAL NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON ai_usage(createdAt);

  -- Messages from the in-app contact form, answered from the admin panel.
  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    userId TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'other',
    message TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'new',          -- new | open | done
    ip TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status, createdAt DESC);

  -- Company insights are the same for everyone who pastes the same posting: cached by hash.
  CREATE TABLE IF NOT EXISTS insights_cache (
    hash TEXT PRIMARY KEY,
    result TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  -- The spoken-prompt disk cache, tracked so it can be evicted least-recently-used first.
  CREATE TABLE IF NOT EXISTS tts_cache (
    key TEXT PRIMARY KEY,
    bytes INTEGER NOT NULL,
    lastUsedAt INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tts_used ON tts_cache(lastUsedAt);
`;

/**
 * Idempotent and race-safe column migration: two build workers can both see the column missing;
 * the loser's "duplicate column name" is not an error. Arguments are always code literals.
 */
export function addColumnIfMissing(d: Pick<Database.Database, "prepare" | "exec">, table: string, column: string, ddl: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.length === 0 || cols.some((c) => c.name === column)) return;
  try {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (error) {
    if (!(error instanceof Error && /duplicate column name/i.test(error.message))) throw error;
  }
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
export function setSetting(key: string, value: string): void {
  getDb().prepare("INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt")
    .run(key, value, nowIso());
}
