import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { configureProviderProfileCommand } from "./providers.js";
import { runCommand } from "./run.js";
import { subscribeWorldCommand } from "./world.js";

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

  test("runs a goal through a saved provider profile", async () => {
    const requests: { readonly url: string; readonly init: RequestInit }[] = [];
    const profilesPath = join(mkdtempSync(join(tmpdir(), "cli-run-provider-profiles-")), "profiles.json");
    configureProviderProfileCommand({
      profilesPath,
      name: "openrouter",
      kind: "openai-compat",
      apiKeyEnv: "OPENROUTER_API_KEY",
      model: "openrouter/test-model",
      baseUrl: "https://openrouter.example",
      capabilities: ["chat", "json_mode"],
      contextWindow: 128000,
      costClass: "medium",
    });

    const result = await runCommand({
      goal: "write a provider-backed test",
      domain: "coding",
      worldRoot: createWorldFixture(),
      providerProfilesPath: profilesPath,
      providerProfile: "openrouter",
      env: { OPENROUTER_API_KEY: "provider-secret" },
      fetch: async (url, init) => {
        requests.push({ url, init });
        return Response.json({ choices: [{ message: { content: "provider text" } }] });
      },
    });

    expect(result).toMatchObject({
      success: true,
      provider: { kind: "openai-compat", id: "run-openrouter", model: "openrouter/test-model" },
      episodeKinds: expect.arrayContaining(["plan", "prediction", "action", "validation", "reflection"]),
    });
    expect(requests).toHaveLength(4);
    expect(requests[0]?.url).toBe("https://openrouter.example/v1/chat/completions");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer provider-secret" });
  });

  test("loads planning context from saved world subscriptions", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-run-world-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const statePath = join(root, "state.db");
    write(join(publicWorld, "domains", "coding", "skills", "public-pattern", "SKILL.md"), "# Public Pattern\n\nShared coding pattern.");
    write(join(privateWorld, "domains", "coding", "skills", "private-pattern", "SKILL.md"), "# Private Pattern\n\nTeam coding pattern.");
    subscribeWorldCommand({ subscriptionsPath, label: "public", root: publicWorld, priority: 1 });
    subscribeWorldCommand({ subscriptionsPath, label: "private", root: privateWorld, priority: 0 });

    const result = await runCommand({
      goal: "use a coding pattern",
      domain: "coding",
      statePath,
      worldSubscriptionsPath: subscriptionsPath,
    });
    const state = new SQLiteStateRepository(statePath);
    const run = state.listRuns()[0];
    const plan = run === undefined ? undefined : state.listEpisodes(run.id).find((episode) => episode.kind === "plan");

    expect(result.success).toBe(true);
    expect(plan).toMatchObject({ kind: "plan" });
    expect(plan?.plan).toContain("Private Pattern");
    expect(plan?.plan).toContain("Public Pattern");
    state.close();
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
