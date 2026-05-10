import { existsSync, mkdirSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { pullWorld, type GitCommand } from "./pull.js";

describe("pullWorld", () => {
  test("clones a missing world destination", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-pull-"));
    const destination = join(root, "canonical");
    const commands: GitCommand[] = [];

    const result = await pullWorld({
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

    expect(result).toEqual({
      mode: "cloned",
      remote: "https://example.test/world.git",
      destination,
      ref: "main",
    });
    expect(commands).toEqual([
      { args: ["clone", "https://example.test/world.git", destination] },
      { args: ["checkout", "main"], cwd: destination },
    ]);
  });

  test("updates an existing git world destination", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-pull-existing-"));
    const destination = join(root, "canonical");
    mkdirSync(join(destination, ".git"), { recursive: true });
    const commands: GitCommand[] = [];

    const result = await pullWorld({
      remote: "https://example.test/world.git",
      destination,
      ref: "main",
      runner: async (command) => {
        commands.push(command);
      },
    });

    expect(result.mode).toBe("updated");
    expect(commands).toEqual([
      { args: ["fetch", "--all", "--prune"], cwd: destination },
      { args: ["checkout", "main"], cwd: destination },
      { args: ["pull", "--ff-only"], cwd: destination },
    ]);
  });

  test("rejects an existing non-git destination", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-pull-non-git-"));
    const destination = join(root, "canonical");
    mkdirSync(destination, { recursive: true });

    await expect(
      pullWorld({
        remote: "https://example.test/world.git",
        destination,
        runner: async () => {
          throw new Error("runner should not be called");
        },
      }),
    ).rejects.toThrow("World destination exists but is not a git checkout");
    expect(existsSync(join(destination, ".git"))).toBe(false);
  });
});
