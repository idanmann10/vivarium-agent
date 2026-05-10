import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { runCommand } from "./run.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-run-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(join(root, "domains", "coding", "skills", "provider-run", "SKILL.md"), "# Provider Run\n\nUse configured providers.");
  return root;
}

describe("runCommand", () => {
  test("runs a goal through a configured OpenAI-compatible provider", async () => {
    const requests: { readonly url: string; readonly init: RequestInit }[] = [];
    const result = await runCommand({
      goal: "write a provider-backed test",
      domain: "coding",
      worldRoot: createWorldFixture(),
      providerKind: "openai-compat",
      providerApiKeyEnv: "OPENROUTER_API_KEY",
      providerModel: "openrouter/test-model",
      providerBaseUrl: "https://openrouter.example",
      env: { OPENROUTER_API_KEY: "provider-secret" },
      fetch: async (url, init) => {
        requests.push({ url, init });
        return Response.json({ choices: [{ message: { content: "provider text" } }] });
      },
    });

    expect(result).toMatchObject({
      success: true,
      provider: { kind: "openai-compat", id: "run-openai-compat", model: "openrouter/test-model" },
      episodeKinds: expect.arrayContaining(["plan", "prediction", "action", "validation", "reflection"]),
    });
    expect(requests).toHaveLength(4);
    expect(requests[0]?.url).toBe("https://openrouter.example/v1/chat/completions");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer provider-secret" });
  });

  test("reports missing provider environment before starting a run", async () => {
    const result = await runCommand({
      goal: "write a provider-backed test",
      worldRoot: createWorldFixture(),
      providerKind: "openai",
      providerApiKeyEnv: "OPENAI_API_KEY",
      providerModel: "gpt-test",
      env: {},
      fetch: async () => {
        throw new Error("fetch should not run without an API key");
      },
    });

    expect(result).toEqual({
      success: false,
      runId: null,
      provider: { kind: "openai", id: "run-openai", model: "gpt-test" },
      episodeKinds: [],
      error: "Missing provider environment variable: OPENAI_API_KEY",
    });
  });

  test("reports unsupported provider kinds before starting a run", async () => {
    const result = await runCommand({
      goal: "write a provider-backed test",
      worldRoot: createWorldFixture(),
      providerKind: "ollama" as never,
      providerApiKeyEnv: "OLLAMA_API_KEY",
      providerModel: "ollama/test",
      providerBaseUrl: "https://ollama.example",
      env: { OLLAMA_API_KEY: "provider-secret" },
      fetch: async () => {
        throw new Error("fetch should not run for unsupported provider kinds");
      },
    });

    expect(result).toEqual({
      success: false,
      runId: null,
      provider: { kind: "ollama", id: "run-ollama", model: "ollama/test" },
      episodeKinds: [],
      error: "Unsupported --provider-kind: ollama",
    });
  });
});
