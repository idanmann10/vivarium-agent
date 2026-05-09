import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { runMigrations } from "./migrations.js";

interface TableRow {
  readonly name: string;
}

interface VersionRow {
  readonly version: string;
}

describe("runMigrations", () => {
  test("creates state tables and records migration version idempotently", () => {
    const db = new Database(join(mkdtempSync(join(tmpdir(), "migrations-")), "state.db"));

    runMigrations(db);
    runMigrations(db);

    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as TableRow[];
    const versions = db.query("SELECT version FROM schema_migrations ORDER BY version").all() as VersionRow[];

    expect(tables.map((row) => row.name)).toContain("runs");
    expect(tables.map((row) => row.name)).toContain("episodes");
    expect(versions).toEqual([{ version: "0001_initial" }]);
    db.close();
  });
});
