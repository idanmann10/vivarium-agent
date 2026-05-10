import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../../../packages/state/src/index.js";
import { dispatchCliCommand } from "./dispatcher.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-dispatch-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(join(root, "domains", "coding", "skills", "red-green", "SKILL.md"), "# Red Green\n\nCoding test skill.");
  write(join(root, "domains", "coding", "traces", "debugging", "TRACE.md"), "# Debugging Trace\n\nA coding trace.");
  return root;
}

function runGit(args: readonly string[], cwd?: string): void {
  const result =
    cwd === undefined
      ? Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" })
      : Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr?.toString() ?? "git command failed");
  }
}

describe("dispatchCliCommand", () => {
  test("routes status and doctor commands", async () => {
    await expect(dispatchCliCommand(["status"])).resolves.toMatchObject({
      command: "status",
      result: { repo: "the-agent", runtime: "offline-local" },
    });
    await expect(dispatchCliCommand(["doctor"])).resolves.toMatchObject({
      command: "doctor",
      result: { ok: true },
    });
    await expect(dispatchCliCommand(["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"])).resolves.toMatchObject({
      command: "doctor",
      result: {
        checks: expect.arrayContaining([
          expect.stringMatching(/^agent\.remote:/),
          expect.stringMatching(/^world\.remote:/),
          expect.stringMatching(/^provider\.env:/),
          expect.stringMatching(/^github\.env:/),
          expect.stringMatching(/^github\.auth:/),
          expect.stringMatching(/^docker:/),
          expect.stringMatching(/^docker\.compose:/),
        ]),
      },
    });
  });

  test("routes init, skills, and world commands with explicit paths", async () => {
    const worldRoot = createWorldFixture();
    const statePath = join(mkdtempSync(join(tmpdir(), "cli-dispatch-state-")), "state.db");

    const init = await dispatchCliCommand([
      "init",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--bind-github",
      "--provider",
      "anthropic",
      "--credential",
      "GITHUB_TOKEN",
    ]);
    const skills = await dispatchCliCommand(["skills", "list", "--state-path", statePath, "--domain", "coding"]);
    const world = await dispatchCliCommand([
      "world",
      "search",
      "--world-root",
      worldRoot,
      "--domain",
      "coding",
      "--query",
      "red green",
      "--limit",
      "1",
    ]);

    expect(init.result).toMatchObject({
      primaryDomain: "coding",
      prompts: ["Bind GitHub identity", "Configure provider: anthropic", "Add credential: GITHUB_TOKEN"],
    });
    expect(skills.result).toMatchObject({ skills: [{ name: "Red Green", domain: "coding" }] });
    expect(world.result).toMatchObject({ results: [{ title: "Red Green" }] });
  });

  test("routes world pull with a local git remote", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-world-pull-"));
    const remote = join(root, "remote.git");
    const destination = join(root, "canonical");
    runGit(["init", "--bare", remote]);

    const pulled = await dispatchCliCommand([
      "world",
      "pull",
      "--remote",
      remote,
      "--destination",
      destination,
    ]);

    expect(pulled.result).toMatchObject({ mode: "cloned", remote, destination });
  });

  test("routes multi-world search with source labels", async () => {
    const publicWorld = mkdtempSync(join(tmpdir(), "cli-dispatch-public-world-"));
    const privateWorld = mkdtempSync(join(tmpdir(), "cli-dispatch-private-world-"));
    write(join(publicWorld, "domains", "coding", "skills", "public-skill", "SKILL.md"), "# Public Skill\n\nShared coding pattern.");
    write(join(privateWorld, "domains", "coding", "skills", "private-skill", "SKILL.md"), "# Private Skill\n\nTeam coding pattern.");

    const result = await dispatchCliCommand([
      "world",
      "search",
      "--world-root",
      privateWorld,
      "--world-label",
      "private",
      "--world-root",
      publicWorld,
      "--world-label",
      "public",
      "--domain",
      "coding",
      "--query",
      "coding pattern",
      "--limit",
      "1",
    ]);

    expect(result.result).toMatchObject({
      results: [
        { source: "private", title: "Private Skill" },
        { source: "public", title: "Public Skill" },
      ],
    });
  });

  test("routes saved world subscriptions into search", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    write(join(publicWorld, "domains", "coding", "skills", "public-skill", "SKILL.md"), "# Public Skill\n\nShared coding pattern.");
    write(join(privateWorld, "domains", "coding", "skills", "private-skill", "SKILL.md"), "# Private Skill\n\nTeam coding pattern.");

    const publicSubscription = await dispatchCliCommand([
      "world",
      "subscribe",
      "--subscriptions-path",
      subscriptionsPath,
      "--world-root",
      publicWorld,
      "--world-label",
      "public",
      "--world-ref",
      "git@example.test:world/public.git",
      "--priority",
      "1",
    ]);
    const privateSubscription = await dispatchCliCommand([
      "world",
      "subscribe",
      "--subscriptions-path",
      subscriptionsPath,
      "--world-root",
      privateWorld,
      "--world-label",
      "private",
      "--world-ref",
      "git@example.test:world/private.git",
      "--priority",
      "0",
      "--auto-push",
    ]);
    const listed = await dispatchCliCommand(["world", "subscriptions", "--subscriptions-path", subscriptionsPath]);
    const searched = await dispatchCliCommand([
      "world",
      "search",
      "--subscriptions-path",
      subscriptionsPath,
      "--domain",
      "coding",
      "--query",
      "coding pattern",
      "--limit",
      "1",
    ]);

    expect(publicSubscription.result).toMatchObject({ subscriptions: [{ label: "public", priority: 1 }] });
    expect(privateSubscription.result).toMatchObject({
      subscriptions: [
        { label: "private", priority: 0, autoPushEnabled: true },
        { label: "public", priority: 1, autoPushEnabled: false },
      ],
    });
    expect(listed.result).toMatchObject({
      subscriptions: [
        { label: "private", priority: 0 },
        { label: "public", priority: 1 },
      ],
    });
    expect(searched.result).toMatchObject({
      results: [
        { source: "private", title: "Private Skill" },
        { source: "public", title: "Public Skill" },
      ],
    });
  });

  test("routes saved world subscriptions into runs", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-run-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const statePath = join(root, "state.db");
    write(join(publicWorld, "domains", "coding", "skills", "public-pattern", "SKILL.md"), "# Public Pattern\n\nShared coding pattern.");
    write(join(privateWorld, "domains", "coding", "skills", "private-pattern", "SKILL.md"), "# Private Pattern\n\nTeam coding pattern.");
    await dispatchCliCommand([
      "world",
      "subscribe",
      "--subscriptions-path",
      subscriptionsPath,
      "--world-root",
      publicWorld,
      "--world-label",
      "public",
      "--priority",
      "1",
    ]);
    await dispatchCliCommand([
      "world",
      "subscribe",
      "--subscriptions-path",
      subscriptionsPath,
      "--world-root",
      privateWorld,
      "--world-label",
      "private",
      "--priority",
      "0",
    ]);
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "use a coding pattern",
      "--domain",
      "coding",
      "--state-path",
      statePath,
      "--world-subscriptions-path",
      subscriptionsPath,
    ]);
    const state = new SQLiteStateRepository(statePath);
    const storedRun = state.listRuns()[0];
    const plan = storedRun === undefined ? undefined : state.listEpisodes(storedRun.id).find((episode) => episode.kind === "plan");

    expect(run.result).toMatchObject({ success: true });
    expect(plan).toMatchObject({ kind: "plan" });
    expect(plan?.plan).toContain("Private Pattern");
    expect(plan?.plan).toContain("Public Pattern");
    state.close();
  });

  test("routes world transmission smoke with a local git remote", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-world-transmission-"));
    const source = join(root, "source");
    const remote = join(root, "remote.git");
    const destination = join(root, "second-install");

    runGit(["init", source]);
    runGit(["config", "user.email", "test@example.test"], source);
    runGit(["config", "user.name", "Test User"], source);
    write(
      join(source, "domains", "coding", "skills", "accepted-contribution", "SKILL.md"),
      "# Accepted Contribution\n\nA generated contribution accepted by maintainers.",
    );
    runGit(["add", "."], source);
    runGit(["commit", "-m", "seed world"], source);
    runGit(["init", "--bare", remote]);
    runGit(["remote", "add", "origin", remote], source);
    runGit(["push", "origin", "HEAD:main"], source);

    const checked = await dispatchCliCommand([
      "world",
      "transmission-smoke",
      "--remote",
      remote,
      "--destination",
      destination,
      "--ref",
      "main",
      "--domain",
      "coding",
      "--query",
      "accepted contribution",
      "--limit",
      "1",
    ]);

    expect(checked.result).toMatchObject({
      ok: true,
      pull: { mode: "cloned", remote, destination, ref: "main" },
      results: [{ kind: "skill", title: "Accepted Contribution" }],
    });
  });

  test("routes run and credentials commands", async () => {
    const worldRoot = createWorldFixture();
    const credentialsPath = join(mkdtempSync(join(tmpdir(), "cli-dispatch-credentials-")), "credentials.json");
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "write a test",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
    ]);
    const added = await dispatchCliCommand([
      "credentials",
      "add",
      "--path",
      credentialsPath,
      "--master-key",
      "dispatch-secret",
      "--kind",
      "api_key",
      "--name",
      "OPENAI_API_KEY",
      "--purpose",
      "provider",
      "--value",
      "sk-test",
      "--scope",
      "model:chat",
    ]);
    const listed = await dispatchCliCommand([
      "credentials",
      "list",
      "--path",
      credentialsPath,
      "--master-key",
      "dispatch-secret",
    ]);
    const smoked = await dispatchCliCommand([
      "credentials",
      "smoke",
      "--path",
      credentialsPath,
      "--master-key",
      "dispatch-secret",
      "--name",
      "OPENAI_API_KEY",
      "--url",
      "https://api.example.test/health",
      "--method",
      "GET",
    ]);

    expect(run.result).toMatchObject({ success: true });
    expect(added.result).toEqual({ stored: true, name: "OPENAI_API_KEY", kind: "api_key" });
    expect(listed.result).toEqual({
      credentials: [{ name: "OPENAI_API_KEY", kind: "api_key", purpose: "provider", scopes: ["model:chat"] }],
    });
    expect(smoked.result).toMatchObject({
      ok: false,
      credentialName: "OPENAI_API_KEY",
      error: "Missing external adapter for http.request",
    });
  });

  test("routes configured provider runs without credentials", async () => {
    const worldRoot = createWorldFixture();
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "write a provider-backed test",
      "--world-root",
      worldRoot,
      "--provider-kind",
      "openai",
      "--provider-api-key-env",
      "VIVARIUM_MISSING_PROVIDER_KEY",
      "--provider-model",
      "gpt-test",
    ]);

    expect(run.result).toEqual({
      success: false,
      runId: null,
      provider: { kind: "openai", id: "run-openai", model: "gpt-test" },
      episodeKinds: [],
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
  });

  test("routes provider smoke checks without credentials", async () => {
    await expect(
      dispatchCliCommand([
        "providers",
        "smoke",
        "--kind",
        "openai",
        "--api-key-env",
        "VIVARIUM_MISSING_PROVIDER_KEY",
        "--model",
        "gpt-test",
      ]),
    ).resolves.toMatchObject({
      command: "providers",
      result: {
        ok: false,
        error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
      },
    });
  });

  test("routes saved provider profiles into smoke and run", async () => {
    const profilesPath = join(mkdtempSync(join(tmpdir(), "cli-dispatch-provider-profiles-")), "profiles.json");
    const worldRoot = createWorldFixture();
    const configured = await dispatchCliCommand([
      "providers",
      "configure",
      "--profiles-path",
      profilesPath,
      "--name",
      "openrouter",
      "--kind",
      "openai-compat",
      "--api-key-env",
      "VIVARIUM_MISSING_PROVIDER_KEY",
      "--model",
      "openrouter/test-model",
      "--base-url",
      "https://openrouter.example",
      "--capability",
      "chat",
      "--capability",
      "json_mode",
      "--context-window",
      "128000",
      "--cost-class",
      "medium",
    ]);
    const listed = await dispatchCliCommand(["providers", "list", "--profiles-path", profilesPath]);
    const smoked = await dispatchCliCommand([
      "providers",
      "smoke",
      "--profiles-path",
      profilesPath,
      "--profile",
      "openrouter",
    ]);
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "write a provider-backed test",
      "--world-root",
      worldRoot,
      "--provider-profiles-path",
      profilesPath,
      "--provider-profile",
      "openrouter",
    ]);

    expect(configured.result).toMatchObject({
      profiles: [
        {
          name: "openrouter",
          kind: "openai-compat",
          apiKeyEnv: "VIVARIUM_MISSING_PROVIDER_KEY",
          model: "openrouter/test-model",
          capabilities: ["chat", "json_mode"],
          contextWindow: 128000,
          costClass: "medium",
        },
      ],
    });
    expect(listed.result).toEqual(configured.result);
    expect(smoked.result).toEqual({
      ok: false,
      kind: "openai-compat",
      model: "openrouter/test-model",
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(run.result).toEqual({
      success: false,
      runId: null,
      provider: { kind: "openai-compat", id: "run-openrouter", model: "openrouter/test-model" },
      episodeKinds: [],
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
  });

  test("routes GitHub smoke checks without credentials", async () => {
    await expect(
      dispatchCliCommand([
        "github",
        "smoke",
        "--owner",
        "owner",
        "--repo",
        "world",
        "--token-env",
        "VIVARIUM_MISSING_GITHUB_TOKEN",
      ]),
    ).resolves.toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing GitHub token environment variable: VIVARIUM_MISSING_GITHUB_TOKEN",
      },
    });
  });

  test("routes guarded GitHub discussion creation", async () => {
    await expect(
      dispatchCliCommand([
        "github",
        "discussion",
        "--owner",
        "owner",
        "--repo",
        "world",
        "--token-env",
        "GITHUB_TOKEN",
        "--repository-id",
        "R_1",
        "--category-id",
        "C_1",
        "--title",
        "Phase 0 RFC",
        "--body",
        "Bootstrap discussion",
      ]),
    ).resolves.toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing --confirm-write for GitHub discussion creation",
      },
    });
  });

  test("routes guarded GitHub pull request creation", async () => {
    await expect(
      dispatchCliCommand([
        "github",
        "pull-request",
        "--owner",
        "owner",
        "--repo",
        "world",
        "--token-env",
        "GITHUB_TOKEN",
        "--title",
        "Add generated skill",
        "--body",
        "Generated artifact",
        "--head",
        "agent:add-generated-skill",
        "--base",
        "main",
      ]),
    ).resolves.toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing --confirm-write for GitHub pull request creation",
      },
    });
  });

  test("routes GitHub workflow run checks without credentials", async () => {
    await expect(
      dispatchCliCommand([
        "github",
        "workflow-runs",
        "--owner",
        "owner",
        "--repo",
        "world",
        "--token-env",
        "VIVARIUM_MISSING_GITHUB_TOKEN",
        "--branch",
        "main",
        "--limit",
        "2",
      ]),
    ).resolves.toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing GitHub token environment variable: VIVARIUM_MISSING_GITHUB_TOKEN",
      },
    });
  });

  test("routes daemon smoke checks", async () => {
    await expect(dispatchCliCommand(["daemon", "smoke", "--status-url", "http://127.0.0.1:9/status"])).resolves.toMatchObject({
      command: "daemon",
      result: {
        ok: false,
      },
    });
  });

  test("returns a usage error for unsupported commands", async () => {
    await expect(dispatchCliCommand(["unknown"])).rejects.toThrow('Unknown command "unknown"');
  });
});
