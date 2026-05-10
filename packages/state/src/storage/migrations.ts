import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "bun:sqlite";

interface Migration {
  readonly version: string;
  readonly fileName: string;
}

const migrations = [
  { version: "0001_initial", fileName: "0001_initial.sql" },
  { version: "0002_semantic_facts", fileName: "0002_semantic_facts.sql" },
  { version: "0003_dream_candidates", fileName: "0003_dream_candidates.sql" },
  { version: "0004_tool_usage", fileName: "0004_tool_usage.sql" },
] as const satisfies readonly Migration[];

export const migrationVersions = migrations.map((migration) => migration.version);

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: Database): void {
  db.run("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");

  for (const migration of migrations) {
    const applied = db
      .query("SELECT version FROM schema_migrations WHERE version = ?")
      .get(migration.version) as { readonly version: string } | null;
    if (applied !== null) {
      continue;
    }

    const sql = readFileSync(join(currentDirectory, "migrations", migration.fileName), "utf8");
    db.exec(sql);
    db.query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
      migration.version,
      new Date().toISOString(),
    );
  }
}
