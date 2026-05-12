import { describe, expect, test } from "bun:test";

import { scanPublicReleaseFiles } from "./public-release-scan.js";

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
});
