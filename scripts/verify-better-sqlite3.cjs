const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const Database = require("better-sqlite3");

const migrations = [
  { version: "0001_initial", fileName: "0001_initial.sql" },
  { version: "0002_semantic_facts", fileName: "0002_semantic_facts.sql" },
  { version: "0003_dream_candidates", fileName: "0003_dream_candidates.sql" },
  { version: "0004_tool_usage", fileName: "0004_tool_usage.sql" },
];

const migrationsRoot = join(__dirname, "..", "packages", "state", "src", "storage", "migrations");
const db = new Database(":memory:");

function runMigrations() {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");

  for (const migration of migrations) {
    const applied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(migration.version);
    if (applied !== undefined) {
      continue;
    }

    db.exec(readFileSync(join(migrationsRoot, migration.fileName), "utf8"));
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
      migration.version,
      new Date(0).toISOString(),
    );
  }
}

try {
  runMigrations();
  runMigrations();

  db.prepare("INSERT INTO local_skills (id, json) VALUES (?, ?)").run(
    "skill-smoke",
    JSON.stringify({ id: "skill-smoke", name: "Smoke Skill" }),
  );

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
  const sampleSkill = db.prepare("SELECT id FROM local_skills WHERE id = ?").get("skill-smoke");

  console.log(
    JSON.stringify({
      ok: true,
      engine: "better-sqlite3",
      migrations: migrations.map((migration) => migration.version),
      tables,
      sampleSkillId: sampleSkill.id,
    }),
  );
} finally {
  db.close();
}
