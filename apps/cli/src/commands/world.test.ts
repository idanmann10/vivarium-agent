import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { pullWorldCommand, searchWorldCommand, verifyWorldTransmissionCommand } from "./world.js";

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

  test("pulls a world through an injected git runner", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-world-pull-"));
    const destination = join(root, "canonical");
    const commands: { readonly args: readonly string[]; readonly cwd?: string }[] = [];

    const result = await pullWorldCommand({
      remote: "https://example.test/world.git",
      destination,
      ref: "main",
      runner: async (command) => {
        commands.push(command);
        if (command.args[0] === "clone") {
          mkdirSync(join(destination, ".git"), { recursive: true });
        }
      },
    });

    expect(result.mode).toBe("cloned");
    expect(commands[0]).toEqual({ args: ["clone", "https://example.test/world.git", destination] });
    expect(existsSync(join(destination, ".git"))).toBe(true);
  });

  test("verifies a pulled world artifact is discoverable in a second install", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-world-transmission-"));
    const destination = join(root, "second-install");

    const result = await verifyWorldTransmissionCommand({
      remote: "https://example.test/world.git",
      destination,
      domain: "coding",
      query: "starter contribution",
      runner: async (command) => {
        if (command.args[0] !== "clone") {
          return;
        }
        mkdirSync(join(destination, ".git"), { recursive: true });
        write(
          join(destination, "domains", "coding", "skills", "starter-contribution", "SKILL.md"),
          "# Starter Contribution\n\nA starter contribution transmitted across installs.",
        );
      },
    });

    expect(result).toMatchObject({
      ok: true,
      pull: { mode: "cloned", remote: "https://example.test/world.git", destination },
      results: [{ kind: "skill", title: "Starter Contribution" }],
    });
  });

  test("reports a pulled world that does not expose the expected artifact", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-world-transmission-miss-"));
    const destination = join(root, "second-install");

    const result = await verifyWorldTransmissionCommand({
      remote: "https://example.test/world.git",
      destination,
      domain: "coding",
      query: "accepted contribution",
      runner: async (command) => {
        if (command.args[0] === "clone") {
          mkdirSync(join(destination, ".git"), { recursive: true });
        }
      },
    });

    expect(result).toEqual({
      ok: false,
      pull: { mode: "cloned", remote: "https://example.test/world.git", destination },
      results: [],
      error: "No world artifacts matched query",
    });
  });
});
