import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { scanPublicReleaseFiles } from "./public-release-scan.js";

function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      [
        `Command failed: ${command.join(" ")}`,
        `stdout:\n${result.stdout.toString()}`,
        `stderr:\n${result.stderr.toString()}`,
      ].join("\n"),
    );
  }
  return result;
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

describe("public release scan", () => {
  test("flags committed local env and encrypted credential files", () => {
    expect(
      scanPublicReleaseFiles([
        { path: "README.md", text: "# Vivarium Agent\n" },
        { path: "live-readiness.local.env", text: "ANTHROPIC_API_KEY=placeholder\n" },
        { path: "docs/live-readiness.local.env", text: "GITHUB_TOKEN=placeholder\n" },
        { path: "fixtures/vivarium-credentials.enc", text: "encrypted bytes\n" },
      ]),
    ).toEqual([
      "live-readiness.local.env: filled live-readiness env files must stay untracked",
      "docs/live-readiness.local.env: filled live-readiness env files must stay untracked",
      "fixtures/vivarium-credentials.enc: encrypted credential stores must stay outside the repository",
    ]);
  });

  test("flags high-confidence provider and GitHub token patterns", () => {
    expect(
      scanPublicReleaseFiles([
        {
          path: "docs/bad.md",
          text: `Anthropic key ${"sk-" + "ant-api03-"}abcdefghijklmnopqrstuvwxyz0123456789\n`,
        },
        {
          path: "docs/openrouter.md",
          text: `OpenRouter key ${"sk-" + "or-v1-"}abcdefghijklmnopqrstuvwxyz0123456789\n`,
        },
        {
          path: "docs/openai.md",
          text: `OpenAI key ${"sk-" + "proj-"}abcdefghijklmnopqrstuvwxyz0123456789\n`,
        },
        {
          path: "docs/github.md",
          text: `GitHub token ${"ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789"}\n`,
        },
        {
          path: "tests/fixture.md",
          text: "Dummy values such as sk-secret-token are safe fixtures.\n",
        },
      ]),
    ).toEqual([
      "docs/bad.md:1: possible Anthropic API key",
      "docs/openrouter.md:1: possible OpenRouter API key",
      "docs/openai.md:1: possible OpenAI API key",
      "docs/github.md:1: possible GitHub token",
    ]);
  });

  test("CLI scans untracked non-ignored files before release", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-public-release-scan-"));
    const scriptPath = resolve("scripts/public-release-scan.ts");

    run(["git", "init"], root);
    write(join(root, "README.md"), "# test repo\n");
    run(["git", "add", "README.md"], root);
    write(join(root, "live-readiness.local.env"), "ANTHROPIC_API_KEY=placeholder\n");

    const result = Bun.spawnSync(["bun", scriptPath], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(
      "live-readiness.local.env: filled live-readiness env files must stay untracked",
    );
  });
});
