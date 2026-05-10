import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, skillId, traceId, type Episode } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { configureProviderProfileCommand } from "./providers.js";
import { runCommand, summarizeRunEpisodes } from "./run.js";
import { subscribeWorldCommand } from "./world.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-run-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(
    join(root, "domains", "coding", "skills", "provider-run", "SKILL.md"),
    "# Provider Run\n\nUse configured providers for provider-backed tests.",
  );
  return root;
}

function createConditionalWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-run-conditional-world-"));
  write(
    join(root, "domains", "research", "skills", "paid-web", "SKILL.md"),
    "---\nname: Paid Web Search\nrequires_toolsets: [web]\nrequires_tools: [web.search]\n---\n\n# Paid Web Search\n\nUse web search.",
  );
  write(
    join(root, "domains", "research", "skills", "free-fallback", "SKILL.md"),
    "---\nname: Free Fallback Search\nfallback_for_toolsets: [web]\nfallback_for_tools: [web.search]\n---\n\n# Free Fallback Search\n\nUse web search.",
  );
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
      transparency: {
        prediction: {
          about: "local-provider.execute",
          confidence: 0.72,
        },
        validation: {
          score: 0.8,
          passed: true,
        },
        consulted: {
          skills: ["domains/coding/skills/provider-run/SKILL.md"],
          traces: [],
        },
      },
    });
    expect(result.transparency.plan).toContain("Loaded: Provider Run");
    expect(result.transparency.validation?.reasons[0]).toBe("provider text");
    expect(requests).toHaveLength(4);
    expect(requests[0]?.url).toBe("https://openrouter.example/v1/chat/completions");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer provider-secret" });
  });

  test("summarizes only high-magnitude surprise evidence", () => {
    const id = runId("run-transparency");
    const agent = agentId("agent-transparency");
    const episodes: Episode[] = [
      {
        kind: "plan",
        id: episodeId("episode-plan"),
        runId: id,
        agentId: agent,
        timestamp: "now",
        tags: [],
        plan: "Plan: inspect and verify.",
        skillsLoaded: [skillId("skill-a")],
        tracesLoaded: [traceId("trace-a")],
      },
      {
        kind: "prediction",
        id: episodeId("episode-prediction"),
        runId: id,
        agentId: agent,
        timestamp: "now",
        tags: [],
        prediction: { about: "tool", expected: "success", confidence: 0.72 },
      },
      {
        kind: "surprise",
        id: episodeId("episode-low-surprise"),
        runId: id,
        agentId: agent,
        timestamp: "now",
        tags: [],
        prediction: { about: "tool", expected: "minor drift", confidence: 0.6 },
        actual: "minor drift with extra logs",
        magnitude: 0.2,
      },
      {
        kind: "surprise",
        id: episodeId("episode-high-surprise"),
        runId: id,
        agentId: agent,
        timestamp: "now",
        tags: [],
        prediction: { about: "tool", expected: "success", confidence: 0.8 },
        actual: "tool failed",
        magnitude: 0.7,
        notes: "Unexpected provider failure.",
      },
    ];

    expect(summarizeRunEpisodes(episodes)).toMatchObject({
      plan: "Plan: inspect and verify.",
      prediction: { expected: "success", confidence: 0.72 },
      consulted: { skills: ["skill-a"], traces: ["trace-a"] },
      highSurprises: [
        {
          expected: "success",
          actual: "tool failed",
          magnitude: 0.7,
          notes: "Unexpected provider failure.",
        },
      ],
    });
  });

  test("passes active tool availability into run retrieval", async () => {
    const worldRoot = createConditionalWorldFixture();

    const fallbackRun = await runCommand({
      goal: "use web search",
      domain: "research",
      worldRoot,
    });
    const paidRun = await runCommand({
      goal: "use web search",
      domain: "research",
      worldRoot,
      availableToolsets: ["web"],
      availableTools: ["web.search"],
    });

    expect(fallbackRun.transparency.consulted.skills).toEqual(["domains/research/skills/free-fallback/SKILL.md"]);
    expect(paidRun.transparency.consulted.skills).toEqual(["domains/research/skills/paid-web/SKILL.md"]);
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
      transparency: {
        plan: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
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
      transparency: {
        plan: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Unsupported --provider-kind: ollama",
    });
  });
});
