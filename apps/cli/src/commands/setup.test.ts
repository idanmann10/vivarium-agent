import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { setupCommand } from "./setup.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = join(tmpdir(), `setup-disk-space-world-${Date.now()}-${Math.random()}`);
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(
    join(root, "domains", "coding", "skills", "red-green", "SKILL.md"),
    "# Red Green\n\nCoding test skill.",
  );
  return root;
}

describe("setupCommand", () => {
  test("reports low disk space before initializing local SQLite state", () => {
    const root = join(tmpdir(), `setup-disk-space-${Date.now()}-${Math.random()}`);
    const statePath = join(root, ".vivarium", "state.db");

    expect(() =>
      setupCommand({
        primaryDomain: "coding",
        worldRoot: createWorldFixture(),
        statePath,
        diskSpaceProbe: () => ({
          path: root,
          availableBytes: 1024,
          minimumBytes: 256 * 1024 * 1024,
        }),
      }),
    ).toThrow("Not enough free disk space for Vivarium setup");
  });
});
