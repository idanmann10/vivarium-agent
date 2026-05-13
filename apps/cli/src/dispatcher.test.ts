import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";

import { SQLiteStateRepository } from "../../../packages/state/src/index.js";
import type { DoctorCommandRunner } from "./commands/doctor.js";
import { dispatchCliCommand } from "./dispatcher.js";

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function createWorldFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "cli-dispatch-world-"));
  write(join(root, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
  write(
    join(root, "domains", "coding", "skills", "red-green", "SKILL.md"),
    "# Red Green\n\nCoding test skill.",
  );
  write(
    join(root, "domains", "coding", "traces", "debugging", "TRACE.md"),
    "# Debugging Trace\n\nA coding trace.",
  );
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

const deterministicDoctorRunner: DoctorCommandRunner = ({ command, args }) => {
  const text = [command, ...args].join(" ");
  if (text === "git remote -v") {
    return { exitCode: 1, stdout: "", stderr: "missing remote" };
  }
  if (text === "gh auth status") {
    return { exitCode: 1, stdout: "", stderr: "invalid token" };
  }
  if (text === "docker --version" || text === "docker compose version") {
    return { exitCode: 0, stdout: `${text} ok`, stderr: "" };
  }

  return { exitCode: 127, stdout: "", stderr: `unexpected command: ${text}` };
};

describe("dispatchCliCommand", () => {
  test("renders branded help for empty args and help aliases", async () => {
    for (const argv of [[], ["help"], ["--help"]] as const) {
      const result = await dispatchCliCommand(argv);

      expect(result.command).toBe("help");
      expect(result.output).toContain("Vivarium Agent");
      expect(result.output).toContain('.-""""-.');
      expect(result.output).toContain("vivarium setup");
      expect(result.output).toContain("vivarium update");
      expect(result.output).toContain("vivarium help");
    }
  });

  test("routes command-level help flags to the safe command guide", async () => {
    const result = await dispatchCliCommand(["run", "--help"]);

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Agent");
    expect(result.output).toContain("Commands");
    expect(result.output).toContain("vivarium setup");
    expect(result.output).toContain("vivarium run --goal");
  });

  test("routes update through the installed checkout updater", async () => {
    const calls: string[] = [];
    const result = await dispatchCliCommand(["update", "--agent-root", "/tmp/vivarium-agent"], {
      updateRunner: (command, args) => {
        calls.push([command, ...args].join(" "));
        return { exitCode: 0, stdout: "ok", stderr: "" };
      },
    });

    expect(result.command).toBe("update");
    expect(result.result).toMatchObject({ ok: true, agentRoot: "/tmp/vivarium-agent" });
    expect(result.output).toContain("Vivarium Update");
    expect(result.output).toContain("Status: updated");
    expect(result.output).toContain("[ok] git pull");
    expect(calls).toEqual([
      "git -C /tmp/vivarium-agent pull --ff-only",
      "bun install --frozen-lockfile",
    ]);
  });

  test("routes model through provider profile summary", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-model-"));
    const profilesPath = join(root, "provider-profiles.json");
    write(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "openrouter",
            kind: "openai-compat",
            apiKeyEnv: "OPENROUTER_API_KEY",
            model: "openrouter/test-model",
            capabilities: ["chat", "json_mode"],
            contextWindow: 128000,
            costClass: "medium",
          },
        ],
      })}\n`,
    );

    const result = await dispatchCliCommand(["model", "--profiles-path", profilesPath]);

    expect(result.command).toBe("model");
    expect(result.result).toMatchObject({ ok: true, profilesPath });
    expect(result.output).toContain("Vivarium Model");
    expect(result.output).toContain("[ok] openrouter");
    expect(result.output).toContain("openrouter/test-model");
  });

  test("routes model through a live readiness env file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-model-env-"));
    const profilesPath = join(root, "provider-profiles.json");
    const envPath = join(root, "live-readiness.local.env");
    write(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "anthropic-main",
            kind: "anthropic",
            apiKeyEnv: "ANTHROPIC_API_KEY",
            model: "claude-test",
            capabilities: ["chat", "tools"],
            contextWindow: 200000,
            costClass: "expensive",
          },
        ],
      })}\n`,
    );
    write(envPath, `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"\n`);

    const result = await dispatchCliCommand(["model", "--env-file", envPath], {
      env: {},
    });

    expect(result.command).toBe("model");
    expect(result.result).toMatchObject({ ok: true, profilesPath });
    expect(result.output).toContain("Vivarium Model");
    expect(result.output).toContain("[ok] anthropic-main");
    expect(result.output).toContain("claude-test");
  });

  test("routes setup through local init with branded terminal output", async () => {
    const worldRoot = createWorldFixture();
    const statePath = join(mkdtempSync(join(tmpdir(), "cli-dispatch-setup-state-")), "state.db");

    const setup = await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);
    const state = new SQLiteStateRepository(statePath);
    const localSkills = state.listLocalSkills().filter((skill) => skill.domain === "coding");
    state.close();

    expect(setup.command).toBe("setup");
    expect(setup.result).toMatchObject({
      ok: true,
      local: {
        primaryDomain: "coding",
        statePath,
        starterSkills: [{ title: "Red Green" }],
      },
      nextCommands: expect.arrayContaining([
        expect.stringContaining("doctor --live --env-file live-readiness.local.env"),
        expect.stringContaining("run --goal"),
      ]),
    });
    expect(localSkills).toEqual([expect.objectContaining({ name: "Red Green", domain: "coding" })]);
    expect(setup.output).toContain("Vivarium Setup");
    expect(setup.output).toContain('.-""""-.');
    expect(setup.output).toContain("Local state initialized");
    expect(setup.output).toContain("Next commands");
    expect(setup.output).toContain("vivarium run --goal");
    expect(setup.output).toContain("live env-init --path live-readiness.local.env");
    expect(setup.output).toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(setup.output).not.toContain("bun apps/cli/src/main.ts");
    expect(setup.output).not.toContain("cp docs/live-readiness.env.example");
    expect(setup.output).not.toContain("chmod 600 live-readiness.local.env");
  });

  test("routes setup live env files through the live setup dry run", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-"));
    const worldRoot = createWorldFixture();
    const statePath = join(root, "state.db");
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-live"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter-live"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.example/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="compat-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-live"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private/test"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-secret"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="internal-api"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
      ].join("\n"),
    );

    const setup = await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--env-file",
      envPath,
    ]);

    expect(setup.result).toMatchObject({
      ok: false,
      local: { statePath },
      live: {
        ok: false,
        written: false,
        requiresConfirmation: true,
        providerProfiles: ["anthropic-live", "openrouter-live", "private-live"],
        credentialName: "internal-api",
      },
      nextCommands: expect.arrayContaining([expect.stringContaining("setup --env-file")]),
    });
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
    expect(setup.output).toContain("Live setup dry run");
    expect(setup.output).toContain("anthropic-live");
    expect(setup.output).toContain("--confirm-write");
    expect(setup.output).toContain("vivarium setup --env-file");
    expect(setup.output).not.toContain("bun apps/cli/src/main.ts");

    const confirmed = await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--env-file",
      envPath,
      "--confirm-write",
    ]);

    expect(confirmed.result).toMatchObject({
      ok: true,
      live: { ok: true, written: true },
      nextCommands: [
        expect.stringContaining("run --goal"),
        expect.stringContaining("doctor --live"),
      ],
    });
    expect(confirmed.output).toContain("Live setup written");
    expect(confirmed.output).not.toContain("cp docs/live-readiness.env.example");
  });

  test("routes status and doctor commands", async () => {
    await expect(dispatchCliCommand(["status"])).resolves.toMatchObject({
      command: "status",
      result: { repo: "the-agent", runtime: "offline-local" },
      output: expect.stringContaining("Vivarium Status"),
    });
    const status = await dispatchCliCommand(["status"]);
    expect(status.output).toContain('.-""""-.');
    expect(status.output).toContain("Repository: the-agent");
    expect(status.output).toContain("vivarium doctor");

    await expect(dispatchCliCommand(["doctor"])).resolves.toMatchObject({
      command: "doctor",
      result: { ok: true },
      output: expect.stringContaining("Vivarium Doctor"),
    });
    const doctor = await dispatchCliCommand(["doctor"]);
    expect(doctor.output).toContain("Readiness: ready");
    expect(doctor.output).toContain("[ok] state:in-memory");

    await expect(
      dispatchCliCommand(["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"], {
        doctorRunner: deterministicDoctorRunner,
      }),
    ).resolves.toMatchObject({
      command: "doctor",
      result: {
        nextActions: expect.arrayContaining([
          expect.objectContaining({ check: expect.stringMatching(/^agent\.name:/) }),
        ]),
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
    const liveDoctor = await dispatchCliCommand(
      ["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"],
      {
        doctorRunner: deterministicDoctorRunner,
      },
    );
    expect(liveDoctor.output).toContain("Readiness: needs attention");
    expect(liveDoctor.output).toContain("[fix] agent.name:missing");
  });

  test("routes live doctor checks through injected probes", async () => {
    await expect(
      dispatchCliCommand(["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"], {
        doctorRunner: deterministicDoctorRunner,
      }),
    ).resolves.toMatchObject({
      command: "doctor",
      result: {
        checks: expect.arrayContaining([
          "agent.remote:missing",
          "world.remote:missing",
          "github.auth:invalid",
        ]),
      },
    });
  });

  test("routes live doctor checks through a copied env file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-env-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        "# Filled from docs/live-readiness.env.example",
        'export VIVARIUM_AGENT_REPO_NAME="agent-final"',
        "export VIVARIUM_WORLD_REPO_NAME=world-final",
        'export ANTHROPIC_API_KEY="configured"',
        'export GITHUB_TOKEN="configured"',
        'export GH_TOKEN="$GITHUB_TOKEN"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand(
      [
        "doctor",
        "--live",
        "--env-file",
        envPath,
        "--agent-root",
        "/agent",
        "--world-root",
        "/world",
      ],
      {
        doctorRunner: deterministicDoctorRunner,
      },
    );
    const checks = (result.result as { checks: readonly string[] }).checks;

    expect(checks).toEqual(
      expect.arrayContaining([
        "agent.name:configured",
        "world.name:configured",
        "provider.env:configured",
        "provider.anthropic:configured",
        "github.env:configured",
      ]),
    );
    expect(checks).not.toContain("agent.name:missing");
    expect(checks).not.toContain("world.name:missing");
    expect(checks).not.toContain("github.env:missing");
  });

  test("reports permissive live env file permissions as a readiness blocker", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-env-permissions-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        "# Filled from docs/live-readiness.env.example",
        'export VIVARIUM_AGENT_REPO_NAME="agent-final"',
        "export VIVARIUM_WORLD_REPO_NAME=world-final",
        'export ANTHROPIC_API_KEY="configured"',
        'export GITHUB_TOKEN="configured"',
      ].join("\n"),
    );
    chmodSync(envPath, 0o644);

    const result = await dispatchCliCommand(
      [
        "doctor",
        "--live",
        "--env-file",
        envPath,
        "--agent-root",
        "/agent",
        "--world-root",
        "/world",
      ],
      {
        doctorRunner: deterministicDoctorRunner,
      },
    );
    const checks = (result.result as { checks: readonly string[] }).checks;

    expect(checks).toContain("liveEnvFile.permissions:insecure");
  });

  test("does not require restrictive permissions for env example templates", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-env-example-"));
    const envPath = join(root, "live-readiness.env.example");
    write(
      envPath,
      [
        "# Copyable template only; no filled secrets.",
        'export VIVARIUM_AGENT_REPO_NAME="<final-agent-repo>"',
        'export VIVARIUM_WORLD_REPO_NAME="<final-world-repo>"',
        'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"',
        'export GITHUB_TOKEN="<redacted-github-token>"',
      ].join("\n"),
    );
    chmodSync(envPath, 0o644);

    const result = await dispatchCliCommand(
      [
        "doctor",
        "--live",
        "--env-file",
        envPath,
        "--agent-root",
        "/agent",
        "--world-root",
        "/world",
      ],
      {
        doctorRunner: deterministicDoctorRunner,
      },
    );
    const checks = (result.result as { checks: readonly string[] }).checks;

    expect(checks).not.toContain("liveEnvFile.permissions:insecure");
  });

  test("passes copied env file values to live doctor probes", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-probe-env-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        'export VIVARIUM_AGENT_REPO_NAME="agent-final"',
        'export VIVARIUM_WORLD_REPO_NAME="world-final"',
        'export GITHUB_TOKEN="configured"',
        'export GH_TOKEN="$GITHUB_TOKEN"',
      ].join("\n"),
    );
    const envAwareDoctorRunner: DoctorCommandRunner = (run) => {
      const text = [run.command, ...run.args].join(" ");
      if (text === "git remote -v") {
        return { exitCode: 1, stdout: "", stderr: "missing remote" };
      }
      if (text === "gh auth status") {
        return run.env?.GH_TOKEN === "configured"
          ? { exitCode: 0, stdout: "authenticated", stderr: "" }
          : { exitCode: 1, stdout: "", stderr: "invalid token" };
      }
      if (text === "docker --version" || text === "docker compose version") {
        return { exitCode: 0, stdout: `${text} ok`, stderr: "" };
      }

      return { exitCode: 127, stdout: "", stderr: `unexpected command: ${text}` };
    };

    const result = await dispatchCliCommand(
      [
        "doctor",
        "--live",
        "--env-file",
        envPath,
        "--agent-root",
        "/agent",
        "--world-root",
        "/world",
      ],
      {
        doctorRunner: envAwareDoctorRunner,
      },
    );
    const checks = (result.result as { checks: readonly string[] }).checks;

    expect(checks).toContain("github.env:configured");
    expect(checks).toContain("github.auth:ok");
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
    const skills = await dispatchCliCommand([
      "skills",
      "list",
      "--state-path",
      statePath,
      "--domain",
      "coding",
    ]);
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
      prompts: [
        "Bind GitHub identity",
        "Configure provider: anthropic",
        "Add credential: GITHUB_TOKEN",
      ],
    });
    expect(init.output).toContain("Vivarium Init");
    expect(init.output).toContain("Domain: coding");
    expect(init.output).toContain("Starter skills:");
    expect(init.output).toContain("Next command:");
    expect(init.output.trim().startsWith("{")).toBe(false);
    expect(skills.result).toMatchObject({ skills: [{ name: "Red Green", domain: "coding" }] });
    expect(skills.output).toContain("Vivarium Skills");
    expect(skills.output).toContain("Skills: 1");
    expect(skills.output.trim().startsWith("{")).toBe(false);
    expect(world.result).toMatchObject({ results: [{ title: "Red Green" }] });
  });

  test("routes advertised dream, identity, curriculum, and publish commands", async () => {
    const worldRoot = createWorldFixture();
    const statePath = join(
      mkdtempSync(join(tmpdir(), "cli-dispatch-roadmap-commands-")),
      "state.db",
    );

    await dispatchCliCommand([
      "init",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);

    const identitySummary = await dispatchCliCommand(["identity", "summary", "--state-path", statePath]);
    const identityStage = await dispatchCliCommand([
      "identity",
      "stage",
      "--state-path",
      statePath,
      "--domain",
      "coding",
    ]);
    const curriculumRead = await dispatchCliCommand(["curriculum", "read", "--world-root", worldRoot, "--domain", "coding"]);
    const curriculumAdvance = await dispatchCliCommand([
      "curriculum",
      "advance",
      "--state-path",
      statePath,
      "--domain",
      "coding",
      "--step",
      "2",
    ]);
    const dream = await dispatchCliCommand(["dream", "run", "--state-path", statePath, "--domain", "coding"]);
    const publish = await dispatchCliCommand(["publish", "list", "--state-path", statePath]);

    expect(identitySummary).toMatchObject({
      command: "identity",
      result: { summary: "Newborn local agent initialized for coding." },
    });
    expect(identitySummary.output).toContain("Vivarium Identity");
    expect(identitySummary.output).toContain("Newborn local agent initialized for coding.");
    expect(identitySummary.output.trim().startsWith("{")).toBe(false);
    expect(identityStage).toMatchObject({
      command: "identity",
      result: { domain: "coding", stage: "newborn" },
    });
    expect(identityStage.output).toContain("Stage: newborn");
    expect(identityStage.output.trim().startsWith("{")).toBe(false);
    expect(curriculumRead).toMatchObject({
      command: "curriculum",
      result: { domain: "coding", body: "# Coding Curriculum\n" },
    });
    expect(curriculumRead.output).toContain("Vivarium Curriculum");
    expect(curriculumRead.output).toContain("# Coding Curriculum");
    expect(curriculumRead.output.trim().startsWith("{")).toBe(false);
    expect(curriculumAdvance).toMatchObject({
      command: "curriculum",
      result: { domain: "coding", progress: { currentStepIndex: 2, completedSteps: [0, 2] } },
    });
    expect(curriculumAdvance.output).toContain("Current step: 2");
    expect(curriculumAdvance.output.trim().startsWith("{")).toBe(false);
    expect(dream).toMatchObject({
      command: "dream",
      result: { identitySummary: "Dream consolidated 1 local skills across coding." },
    });
    expect(dream.output).toContain("Vivarium Dream");
    expect(dream.output).toContain("Dream consolidated 1 local skills across coding.");
    expect(dream.output.trim().startsWith("{")).toBe(false);
    expect(publish).toMatchObject({
      command: "publish",
      result: { publishables: [] },
    });
    expect(publish.output).toContain("Vivarium Publish");
    expect(publish.output).toContain("Publishables: 0");
    expect(publish.output.trim().startsWith("{")).toBe(false);
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
    expect(pulled.output).toContain("Vivarium World Pull");
    expect(pulled.output).toContain("Status: cloned");
    expect(pulled.output).toContain(destination);
    expect(pulled.output.trim().startsWith("{")).toBe(false);
  });

  test("routes multi-world search with source labels", async () => {
    const publicWorld = mkdtempSync(join(tmpdir(), "cli-dispatch-public-world-"));
    const privateWorld = mkdtempSync(join(tmpdir(), "cli-dispatch-private-world-"));
    write(
      join(publicWorld, "domains", "coding", "skills", "public-skill", "SKILL.md"),
      "# Public Skill\n\nShared coding pattern.",
    );
    write(
      join(privateWorld, "domains", "coding", "skills", "private-skill", "SKILL.md"),
      "# Private Skill\n\nTeam coding pattern.",
    );

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
    expect(result.output).toContain("Vivarium World Search");
    expect(result.output).toContain("Results: 2");
    expect(result.output).toContain("Private Skill");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("routes saved world subscriptions into search", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    write(
      join(publicWorld, "domains", "coding", "skills", "public-skill", "SKILL.md"),
      "# Public Skill\n\nShared coding pattern.",
    );
    write(
      join(privateWorld, "domains", "coding", "skills", "private-skill", "SKILL.md"),
      "# Private Skill\n\nTeam coding pattern.",
    );

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
    const listed = await dispatchCliCommand([
      "world",
      "subscriptions",
      "--subscriptions-path",
      subscriptionsPath,
    ]);
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

    expect(publicSubscription.result).toMatchObject({
      subscriptions: [{ label: "public", priority: 1 }],
    });
    expect(publicSubscription.output).toContain("Vivarium World Subscriptions");
    expect(publicSubscription.output).toContain("Subscriptions: 1");
    expect(publicSubscription.output).toContain("public");
    expect(publicSubscription.output.trim().startsWith("{")).toBe(false);
    expect(privateSubscription.result).toMatchObject({
      subscriptions: [
        { label: "private", priority: 0, autoPushEnabled: true },
        { label: "public", priority: 1, autoPushEnabled: false },
      ],
    });
    expect(privateSubscription.output).toContain("Subscriptions: 2");
    expect(privateSubscription.output).toContain("Auto-push: enabled");
    expect(listed.result).toMatchObject({
      subscriptions: [
        { label: "private", priority: 0 },
        { label: "public", priority: 1 },
      ],
    });
    expect(listed.output).toContain("Vivarium World Subscriptions");
    expect(listed.output).toContain("private");
    expect(listed.output.trim().startsWith("{")).toBe(false);
    expect(searched.result).toMatchObject({
      results: [
        { source: "private", title: "Private Skill" },
        { source: "public", title: "Public Skill" },
      ],
    });
    expect(searched.output).toContain("Vivarium World Search");
    expect(searched.output).toContain("Public Skill");
    expect(searched.output.trim().startsWith("{")).toBe(false);
  });

  test("routes saved world subscriptions into runs", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-run-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const statePath = join(root, "state.db");
    write(
      join(publicWorld, "domains", "coding", "skills", "public-pattern", "SKILL.md"),
      "# Public Pattern\n\nShared coding pattern.",
    );
    write(
      join(privateWorld, "domains", "coding", "skills", "private-pattern", "SKILL.md"),
      "# Private Pattern\n\nTeam coding pattern.",
    );
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
    const plan =
      storedRun === undefined
        ? undefined
        : state.listEpisodes(storedRun.id).find((episode) => episode.kind === "plan");

    expect(run.result).toMatchObject({ success: true });
    expect(plan).toMatchObject({ kind: "plan" });
    expect(plan?.plan).toContain("Private Pattern");
    expect(plan?.plan).toContain("Public Pattern");
    state.close();
  });

  test("routes active tool availability into world search and runs", async () => {
    const worldRoot = mkdtempSync(join(tmpdir(), "cli-dispatch-tool-availability-"));
    write(
      join(worldRoot, "domains", "research", "skills", "paid-web", "SKILL.md"),
      "---\nname: Paid Web Search\nrequires_toolsets: [web]\nrequires_tools: [web.search]\n---\n\n# Paid Web Search\n\nUse web search.",
    );
    write(
      join(worldRoot, "domains", "research", "skills", "free-fallback", "SKILL.md"),
      "---\nname: Free Fallback Search\nfallback_for_toolsets: [web]\nfallback_for_tools: [web.search]\n---\n\n# Free Fallback Search\n\nUse web search.",
    );

    const searched = await dispatchCliCommand([
      "world",
      "search",
      "--world-root",
      worldRoot,
      "--domain",
      "research",
      "--query",
      "web search",
      "--available-toolset",
      "web",
      "--available-tool",
      "web.search",
    ]);
    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "use web search",
      "--domain",
      "research",
      "--world-root",
      worldRoot,
      "--available-toolset",
      "web",
      "--available-tool",
      "web.search",
    ]);

    expect(searched.result).toMatchObject({ results: [{ title: "Paid Web Search" }] });
    expect(run.result).toMatchObject({
      transparency: { consulted: { skills: ["domains/research/skills/paid-web/SKILL.md"] } },
    });
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
    expect(checked.output).toContain("Vivarium World Transmission");
    expect(checked.output).toContain("Status: ok");
    expect(checked.output).toContain("Accepted Contribution");
    expect(checked.output.trim().startsWith("{")).toBe(false);
  });

  test("routes run and credentials commands", async () => {
    const worldRoot = createWorldFixture();
    const credentialsPath = join(
      mkdtempSync(join(tmpdir(), "cli-dispatch-credentials-")),
      "credentials.json",
    );
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
    expect(run.output).toContain("Vivarium Run");
    expect(run.output).toContain("Status: success");
    expect(run.output).toContain("Provider: local");
    expect(run.output).toContain("Episodes:");
    expect(run.output.trim().startsWith("{")).toBe(false);
    expect(added.result).toEqual({ stored: true, name: "OPENAI_API_KEY", kind: "api_key" });
    expect(added.output).toContain("Vivarium Credentials");
    expect(added.output).toContain("Status: stored");
    expect(added.output).toContain("OPENAI_API_KEY");
    expect(added.output).not.toContain("sk-test");
    expect(added.output).not.toContain("dispatch-secret");
    expect(added.output.trim().startsWith("{")).toBe(false);
    expect(listed.result).toEqual({
      credentials: [
        { name: "OPENAI_API_KEY", kind: "api_key", purpose: "provider", scopes: ["model:chat"] },
      ],
    });
    expect(listed.output).toContain("Vivarium Credentials");
    expect(listed.output).toContain("Credentials: 1");
    expect(listed.output).toContain("model:chat");
    expect(listed.output).not.toContain("sk-test");
    expect(listed.output.trim().startsWith("{")).toBe(false);
    expect(smoked.result).toMatchObject({
      ok: false,
      credentialName: "OPENAI_API_KEY",
      error: "Missing external adapter for http.request",
    });
    expect(smoked.output).toContain("Vivarium Credential Smoke");
    expect(smoked.output).toContain("Status: blocked");
    expect(smoked.output).toContain("Missing external adapter for http.request");
    expect(smoked.output).not.toContain("sk-test");
    expect(smoked.output).not.toContain("dispatch-secret");
    expect(smoked.output.trim().startsWith("{")).toBe(false);
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
      transparency: {
        plan: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(run.output).toContain("Vivarium Run");
    expect(run.output).toContain("Status: blocked");
    expect(run.output).toContain("Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY");
    expect(run.output.trim().startsWith("{")).toBe(false);
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
    const profilesPath = join(
      mkdtempSync(join(tmpdir(), "cli-dispatch-provider-profiles-")),
      "profiles.json",
    );
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
    expect(configured.output).toContain("Vivarium Providers");
    expect(configured.output).toContain("Profiles: 1");
    expect(configured.output).toContain("openrouter");
    expect(configured.output.trim().startsWith("{")).toBe(false);
    expect(listed.result).toEqual(configured.result);
    expect(listed.output).toContain("Vivarium Providers");
    expect(listed.output).toContain("openrouter/test-model");
    expect(listed.output.trim().startsWith("{")).toBe(false);
    expect(smoked.result).toEqual({
      ok: false,
      kind: "openai-compat",
      model: "openrouter/test-model",
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(smoked.output).toContain("Vivarium Provider Smoke");
    expect(smoked.output).toContain("Status: blocked");
    expect(smoked.output).toContain("openai-compat");
    expect(smoked.output).not.toContain("provider-secret");
    expect(smoked.output.trim().startsWith("{")).toBe(false);
    expect(run.result).toEqual({
      success: false,
      runId: null,
      provider: { kind: "openai-compat", id: "run-openrouter", model: "openrouter/test-model" },
      episodeKinds: [],
      transparency: {
        plan: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
  });

  test("routes live setup through a filled env file with explicit write confirmation", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.example/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://models.internal.example/v1"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand([
      "live",
      "setup",
      "--env-file",
      envPath,
      "--confirm-write",
    ]);
    const listedProfiles = await dispatchCliCommand([
      "providers",
      "list",
      "--profiles-path",
      profilesPath,
    ]);
    const listedCredentials = await dispatchCliCommand([
      "credentials",
      "list",
      "--path",
      credentialsPath,
      "--master-key",
      "master-key",
    ]);

    expect(result.command).toBe("live");
    expect(result.result).toEqual({
      ok: true,
      written: true,
      providerProfiles: ["anthropic-main", "openrouter", "private-finetune"],
      credentialName: "INTERNAL_API_TOKEN",
      paths: { providerProfilesPath: profilesPath, credentialsPath },
    });
    expect(listedProfiles.result).toMatchObject({
      profiles: [
        { name: "anthropic-main", kind: "anthropic", model: "claude-test" },
        {
          name: "openrouter",
          kind: "openai-compat",
          model: "openrouter/test",
          baseUrl: "https://openrouter.example/api/v1",
        },
        {
          name: "private-finetune",
          kind: "openai-compat",
          model: "private-model",
          baseUrl: "https://models.internal.example/v1",
        },
      ],
    });
    expect(listedCredentials.result).toEqual({
      credentials: [
        { name: "INTERNAL_API_TOKEN", kind: "bearer", purpose: "Call internal API", scopes: [] },
      ],
    });
    expect(readFileSync(credentialsPath, "utf8")).not.toContain("internal-secret");
    expect(result.output).not.toContain("internal-secret");
  });

  test("refuses live setup writes without explicit confirmation", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-refuse-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.example/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://models.internal.example/v1"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
      ].join("\n"),
    );

    const dryRun = await dispatchCliCommand(["live", "setup", "--env-file", envPath]);

    expect(dryRun).toMatchObject({
      command: "live",
      result: {
        ok: false,
        written: false,
        requiresConfirmation: true,
        wouldWrite: ["providerProfiles", "credential"],
        providerProfiles: ["anthropic-main", "openrouter", "private-finetune"],
        credentialName: "INTERNAL_API_TOKEN",
        paths: { providerProfilesPath: profilesPath, credentialsPath },
      },
    });
    expect(dryRun.output).toContain("Vivarium Live Setup");
    expect(dryRun.output).toContain("Status: dry run");
    expect(dryRun.output).toContain("anthropic-main");
    expect(dryRun.output).toContain("--confirm-write");
    expect(dryRun.output).not.toContain("anthropic-secret");
    expect(dryRun.output.trim().startsWith("{")).toBe(false);
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
  });

  test("reports missing internal API health URL during live setup preflight", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-health-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.example/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://models.internal.example/v1"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
      ].join("\n"),
    );

    await expect(
      dispatchCliCommand(["live", "setup", "--env-file", envPath]),
    ).resolves.toMatchObject({
      command: "live",
      result: {
        ok: false,
        written: false,
        missing: ["VIVARIUM_INTERNAL_API_HEALTH_URL"],
      },
    });
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
  });

  test("reports invalid live setup URLs before writing files", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-urls-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="not-a-url"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="ftp://models.internal.example/v1"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="internal.example/health"',
      ].join("\n"),
    );

    await expect(
      dispatchCliCommand(["live", "setup", "--env-file", envPath, "--confirm-write"]),
    ).resolves.toMatchObject({
      command: "live",
      result: {
        ok: false,
        written: false,
        invalid: [
          "VIVARIUM_OPENROUTER_BASE_URL",
          "VIVARIUM_OAI_COMPAT_BASE_URL",
          "VIVARIUM_INTERNAL_API_HEALTH_URL",
        ],
      },
    });
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
  });

  test("does not double-count copied-template URLs as invalid during live setup", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-template-urls-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        'export VIVARIUM_PROVIDER_PROFILES_PATH="/tmp/provider-profiles.json"',
        'export ANTHROPIC_API_KEY="anthropic-secret"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-test"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="200000"',
        'export OPENROUTER_API_KEY="openrouter-secret"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/test"',
        'export VIVARIUM_OPENROUTER_BASE_URL="<openrouter-base-url>"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="<private-oai-compatible-base-url>"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="64000"',
        'export VIVARIUM_CREDENTIALS_PATH="/tmp/credentials.enc"',
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="<internal-health-url>"',
      ].join("\n"),
    );

    await expect(
      dispatchCliCommand(["live", "setup", "--env-file", envPath]),
    ).resolves.toMatchObject({
      command: "live",
      result: {
        ok: false,
        written: false,
        placeholders: [
          "VIVARIUM_OPENROUTER_BASE_URL",
          "VIVARIUM_OAI_COMPAT_BASE_URL",
          "VIVARIUM_INTERNAL_API_HEALTH_URL",
        ],
      },
    });
    const result = await dispatchCliCommand(["live", "setup", "--env-file", envPath]);
    expect(result.result).not.toHaveProperty("invalid");
  });

  test("routes live evidence init and refuses accidental overwrite", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-evidence-"));
    const evidencePath = join(root, "v1-evidence.json");

    const created = await dispatchCliCommand(["live", "evidence-init", "--path", evidencePath]);
    const body = JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
    const refused = await dispatchCliCommand(["live", "evidence-init", "--path", evidencePath]);
    const overwritten = await dispatchCliCommand([
      "live",
      "evidence-init",
      "--path",
      evidencePath,
      "--overwrite",
    ]);

    expect(created.command).toBe("live");
    expect(created.output).toContain("Vivarium Live Evidence");
    expect(created.output).toContain("Status: written");
    expect(created.output).toContain("Sections: 11");
    expect(created.output).toContain("vivarium doctor --live");
    expect(created.output.trim().startsWith("{")).toBe(false);
    expect(created.result).toEqual({
      ok: true,
      written: true,
      path: evidencePath,
      sections: [
        "starterPack",
        "realGoals",
        "providerSmokes",
        "internalCredentialSmoke",
        "worldSubscriptions",
        "behaviorLoop",
        "dreamArtifacts",
        "publicContribution",
        "publishedArtifacts",
        "curationStats",
        "twoWeekImprovement",
      ],
    });
    expect(body.starterPack).toMatchObject({
      primaryDomain: "coding",
      skillCount: 0,
      traceCount: 0,
    });
    expect(body.realGoals).toEqual([]);
    expect(body.providerSmokes).toEqual({ anthropic: "", openRouter: "", privateOaiCompat: "" });
    expect(refused.result).toEqual({
      ok: false,
      written: false,
      path: evidencePath,
      error: "Evidence manifest already exists. Pass --overwrite to replace it.",
    });
    expect(refused.output).toContain("Status: blocked");
    expect(refused.output).toContain("--overwrite");
    expect(refused.output.trim().startsWith("{")).toBe(false);
    expect(overwritten.result).toMatchObject({ ok: true, written: true, path: evidencePath });
  });

  test("routes live env init with private permissions and refuses accidental overwrite", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-env-init-"));
    const envPath = join(root, "live-readiness.local.env");

    const created = await dispatchCliCommand(["live", "env-init", "--path", envPath]);
    const createdOutput = created.output;
    const body = readFileSync(envPath, "utf8");
    const mode = statSync(envPath).mode & 0o777;
    const refused = await dispatchCliCommand(["live", "env-init", "--path", envPath]);
    writeFileSync(envPath, "changed\n", "utf8");
    const overwritten = await dispatchCliCommand([
      "live",
      "env-init",
      "--path",
      envPath,
      "--overwrite",
    ]);

    expect(created.result).toEqual({
      ok: true,
      written: true,
      path: envPath,
      mode: "0600",
      templatePath: "docs/live-readiness.env.example",
    });
    expect(createdOutput).toContain("Vivarium Live Env");
    expect(createdOutput).toContain("Status: written");
    expect(createdOutput).toContain(envPath);
    expect(createdOutput).toContain("Permissions: 0600");
    expect(createdOutput).toContain("Next commands");
    expect(createdOutput.trim().startsWith("{")).toBe(false);
    expect(body).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(body).toContain("source live-readiness.local.env");
    expect(mode).toBe(0o600);
    expect(refused.result).toEqual({
      ok: false,
      written: false,
      path: envPath,
      error: "Live readiness env already exists. Pass --overwrite to replace it.",
    });
    expect(overwritten.result).toMatchObject({ ok: true, written: true, path: envPath });
    expect(readFileSync(envPath, "utf8")).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
  });

  test("routes GitHub smoke checks without credentials", async () => {
    const result = await dispatchCliCommand([
      "github",
      "smoke",
      "--owner",
      "owner",
      "--repo",
      "world",
      "--token-env",
      "VIVARIUM_MISSING_GITHUB_TOKEN",
    ]);

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing GitHub token environment variable: VIVARIUM_MISSING_GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Smoke");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("owner/world");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("routes guarded GitHub discussion creation", async () => {
    const result = await dispatchCliCommand([
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
    ]);

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing --confirm-write for GitHub discussion creation",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Discussion");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("--confirm-write");
    expect(result.output).not.toContain("Bootstrap discussion");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("routes guarded GitHub pull request creation", async () => {
    const result = await dispatchCliCommand([
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
    ]);

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing --confirm-write for GitHub pull request creation",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Pull Request");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("--confirm-write");
    expect(result.output).not.toContain("Generated artifact");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("routes GitHub workflow run checks without credentials", async () => {
    const result = await dispatchCliCommand([
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
    ]);

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        error: "Missing GitHub token environment variable: VIVARIUM_MISSING_GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Workflows");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("owner/world");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("routes daemon smoke checks", async () => {
    const result = await dispatchCliCommand([
      "daemon",
      "smoke",
      "--status-url",
      "http://127.0.0.1:9/status",
    ]);

    expect(result).toMatchObject({
      command: "daemon",
      result: {
        ok: false,
      },
    });
    expect(result.output).toContain("Vivarium Daemon Smoke");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("http://127.0.0.1:9/status");
    expect(result.output.trim().startsWith("{")).toBe(false);
  });

  test("returns a usage error for unsupported commands", async () => {
    await expect(dispatchCliCommand(["unknown"])).rejects.toThrow('Unknown command "unknown"');
  });
});
