import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { searchWorldCommand } from "./world.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

describe("world commands", () => {
  test("searches the local world", () => {
    const worldRoot = mkdtempSync(join(tmpdir(), "cli-world-"));
    write(join(worldRoot, "domains", "coding", "skills", "testing", "SKILL.md"), "# Testing\n\nCoding tests.");

    expect(searchWorldCommand({ worldRoot, domain: "coding", query: "coding", limit: 1 }).results).toEqual([
      expect.objectContaining({ kind: "skill", title: "Testing" }),
    ]);
  });
});
