#!/usr/bin/env node
"use strict";

/**
 * DB migration runner — applies numbered SQL files in migrations/ in order.
 * Usage:
 *   node scripts/migrate.js              # run all pending
 *   node scripts/migrate.js --dry-run   # print SQL without executing
 *   node scripts/migrate.js --status    # show applied migrations
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 8000,
});

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");
const DRY_RUN = process.argv.includes("--dry-run");
const STATUS  = process.argv.includes("--status");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT    NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query("SELECT version, description, applied_at FROM schema_migrations ORDER BY version ASC");
  return rows;
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    if (STATUS) {
      const applied = await getApplied(client);
      console.log("\nApplied migrations:");
      if (!applied.length) console.log("  (none)");
      for (const m of applied) {
        console.log(`  v${m.version}  ${m.description}  (${m.applied_at.toISOString().slice(0,10)})`);
      }
      const files = getMigrationFiles();
      const appliedVersions = new Set(applied.map(m => m.version));
      const pending = files.filter(f => !appliedVersions.has(parseInt(f.slice(0, 3), 10)));
      if (pending.length) {
        console.log("\nPending migrations:");
        for (const f of pending) console.log(`  ${f}`);
      } else {
        console.log("\nAll migrations applied.");
      }
      return;
    }

    const applied = await getApplied(client);
    const appliedVersions = new Set(applied.map(m => m.version));
    const files = getMigrationFiles();
    const pending = files.filter(f => !appliedVersions.has(parseInt(f.slice(0, 3), 10)));

    if (!pending.length) {
      console.log("All migrations are up to date.");
      return;
    }

    for (const file of pending) {
      const version = parseInt(file.slice(0, 3), 10);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`\nApplying: ${file} ...`);
      if (DRY_RUN) {
        console.log("[dry-run] SQL:\n" + sql.slice(0, 400) + (sql.length > 400 ? "\n..." : ""));
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        // Ensure version is recorded (migration file may have its own INSERT ON CONFLICT)
        await client.query(
          `INSERT INTO schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
          [version, file.replace(/^\d{3}_/, "").replace(/\.sql$/, "")]
        );
        await client.query("COMMIT");
        console.log(`  ✓ v${version} applied`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ v${version} FAILED: ${err.message}`);
        process.exit(1);
      }
    }

    console.log("\nDone.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
