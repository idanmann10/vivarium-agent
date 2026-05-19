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
import type { SetupCommandResult } from "./commands/setup.js";
import { CliUsageError, dispatchCliCommand } from "./dispatcher.js";

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
      expect(result.output).toContain("VIVARIUM // local memory // world culture");
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
    expect(result.output).toContain("vivarium local run");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes local run help to the simple-agent command guide", async () => {
    const result = await dispatchCliCommand(["local", "run", "--help"]);

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Local Run");
    expect(result.output).toContain("Usage: vivarium local run");
    expect(result.output).not.toContain('Usage: vivarium local run --goal "build a simple agent end to end"');
    expect(result.output).toContain("--goal <text>");
    expect(result.output).toContain("--state-path <path>");
    expect(result.output).toContain("--world-root <path>");
    expect(result.output).toContain("--live-env-path <path>");
    expect(result.output).toContain("--provider-profile <name>");
    expect(result.output).toContain("vivarium status");
    expect(result.output).not.toContain("Commands");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes local setup help to the first-run setup guide", async () => {
    const result = await dispatchCliCommand(["local", "--help"]);
    const nextBlock = result.output.slice(result.output.indexOf("Next"));

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Local Setup");
    expect(result.output).toContain("Usage: vivarium local");
    expect(result.output).toContain("--state-path <path>");
    expect(result.output).toContain("--world-root <path>");
    expect(result.output).toContain("--live-env-path <path>");
    expect(result.output).toContain("--github-owner <name>");
    expect(result.output).toContain("\n  vivarium local run\n");
    expect(nextBlock).toContain("vivarium dashboard");
    expect(nextBlock).toContain("vivarium daemon smoke");
    expect(nextBlock).toContain("vivarium status");
    expect(nextBlock).not.toContain("vivarium launch handoff");
    expect(result.output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(result.output).not.toContain("Commands");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes setup help to the focused setup guide", async () => {
    const result = await dispatchCliCommand(["setup", "--help"]);
    const nextBlock = result.output.slice(result.output.indexOf("Next"));

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Setup");
    expect(result.output).toContain("Usage: vivarium setup");
    expect(result.output).toContain("--env-file <path>");
    expect(result.output).toContain("--confirm-write");
    expect(result.output).toContain("vivarium setup live");
    expect(result.output).not.toContain("vivarium connect");
    expect(nextBlock).toContain("vivarium local run");
    expect(nextBlock).toContain("vivarium dashboard");
    expect(nextBlock).toContain("vivarium daemon smoke");
    expect(nextBlock).toContain("vivarium status");
    expect(nextBlock).not.toContain("vivarium setup live");
    expect(nextBlock).not.toContain("vivarium doctor --live");
    expect(result.output).not.toContain("Commands");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes status help to the local proof command guide", async () => {
    const result = await dispatchCliCommand(["status", "--help"]);

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Status");
    expect(result.output).toContain("Usage: vivarium status");
    expect(result.output).toContain("--state-path <path>");
    expect(result.output).toContain("--live-env-path <path>");
    expect(result.output).toContain("vivarium local run");
    expect(result.output).toContain("vivarium proof");
    expect(result.output).not.toContain("Commands");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes launch handoff help to the Mac handoff command guide", async () => {
    const result = await dispatchCliCommand(["launch", "handoff", "--help"]);

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Launch Handoff");
    expect(result.output).toContain("Usage: vivarium launch handoff");
    expect(result.output).toContain("--ref <branch-or-tag-or-commit>");
    expect(result.output).toContain("--script-ref <commit-or-tag>");
    expect(result.output).toContain("--daemon-host <host>");
    expect(result.output).toContain("--daemon-port <port>");
    expect(result.output).toContain("--pr-number <number>");
    expect(result.output).toContain("--reviewer <github-username>");
    expect(result.output).toContain("vivarium launch handoff --pr-number 26 --reviewer REVIEWER_GITHUB_USERNAME");
    expect(result.output).not.toContain("Commands");
    expect(result.output).not.toContain("vivarium run --goal");
  });

  test("routes daemon smoke help to the Mac daemon smoke guide", async () => {
    const result = await dispatchCliCommand(["daemon", "smoke", "--help"]);

    expect(result.command).toBe("help");
    expect(result.output).toContain("Vivarium Daemon Smoke");
    expect(result.output).toContain("Usage: vivarium daemon smoke");
    expect(result.output).toContain("--status-url <url>");
    expect(result.output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(result.output).toContain("vivarium dashboard");
    expect(result.output).toContain("vivarium status");
    expect(result.output).not.toContain("vivarium launch handoff");
    expect(result.output).not.toContain("Commands");
  });

  test("routes dashboard to the local daemon gateway URL", async () => {
    const result = await dispatchCliCommand(["dashboard"]);

    expect(result.command).toBe("dashboard");
    expect(result.output).toContain("Vivarium Gateway");
    expect(result.output).not.toContain("Vivarium Dashboard");
    expect(result.output).toContain("Dashboard: http://127.0.0.1:8787");
    expect(result.output).toContain("Status JSON: http://127.0.0.1:8787/status");
    expect(result.output).toContain("Run API (POST): http://127.0.0.1:8787/run");
    expect(result.output).not.toContain("Run API: http://127.0.0.1:8787/run");
    expect(result.output).toContain("vivarium dashboard --open");
    expect(result.output).toContain("vivarium daemon smoke");
  });

  test("routes dashboard open through an injectable browser opener", async () => {
    const opened: string[] = [];
    const result = await dispatchCliCommand(["dashboard", "--open"], {
      dashboardOpenRunner: (url) => {
        opened.push(url);
        return { exitCode: 0, stderr: "" };
      },
    });

    expect(opened).toEqual(["http://127.0.0.1:8787"]);
    expect(result.command).toBe("dashboard");
    expect(result.result).toMatchObject({ dashboardUrl: "http://127.0.0.1:8787", open: { ok: true } });
    expect(result.output).toContain("Opened: http://127.0.0.1:8787");
    expect(result.output).toContain("vivarium daemon smoke");
  });

  test("routes dashboard with custom URL", async () => {
    const result = await dispatchCliCommand(["dashboard", "--url", "http://127.0.0.1:9898"]);

    expect(result.command).toBe("dashboard");
    expect(result.output).toContain("Dashboard: http://127.0.0.1:9898");
    expect(result.output).toContain("Status JSON: http://127.0.0.1:9898/status");
  });

  test("routes live setup help to focused operator guides", async () => {
    const cases = [
      {
        argv: ["connect", "fill", "--help"],
        title: "Vivarium Connect Fill",
        usage: "Usage: vivarium connect fill",
        option: "--anthropic-key-file <path>",
        next: "vivarium connect setup --confirm-write",
      },
      {
        argv: ["connect", "setup", "--help"],
        title: "Vivarium Connect Setup",
        usage: "Usage: vivarium connect setup --confirm-write",
        option: "--confirm-write",
        next: "vivarium connect smoke",
      },
      {
        argv: ["connect", "smoke", "--help"],
        title: "Vivarium Connect Smoke",
        usage: "Usage: vivarium connect smoke",
        option: "--env-file <path>",
        next: "vivarium proof",
      },
      {
        argv: ["proof", "init", "--help"],
        title: "Vivarium Proof Init",
        usage: "Usage: vivarium proof init",
        option: "--env-file <path>",
        next: "vivarium proof",
      },
      {
        argv: ["github", "smoke", "--help"],
        title: "Vivarium GitHub Smoke",
        usage: "Usage: vivarium github smoke",
        option: "--target <agent|world>",
        next: "vivarium github workflow-runs",
      },
    ] as const;

    for (const item of cases) {
      const result = await dispatchCliCommand(item.argv);

      expect(result.command).toBe("help");
      expect(result.output).toContain(item.title);
      expect(result.output).toContain(item.usage);
      expect(result.output).toContain(item.option);
      expect(result.output).toContain(item.next);
      expect(result.output).not.toContain("Commands");
      expect(result.output).not.toContain("vivarium run --goal");
    }
  });

  test("routes update through the installed checkout updater", async () => {
    const calls: string[] = [];
    const result = await dispatchCliCommand(["update", "--agent-root", "/tmp/vivarium-agent"], {
      env: { VIVARIUM_BUN_PATH: "/opt/vivarium/bin/bun" },
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
      "/opt/vivarium/bin/bun install --frozen-lockfile",
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

    const result = await dispatchCliCommand(["model", "--profiles-path", profilesPath], {
      env: { OPENROUTER_API_KEY: "configured-provider-key" },
    });

    expect(result.command).toBe("model");
    expect(result.result).toMatchObject({ ok: true, profilesPath });
    expect(result.output).toContain("Vivarium Model");
    expect(result.output).toContain("[ok] openrouter");
    expect(result.output).toContain("openrouter/test-model");
    expect(result.output).not.toContain("OPENROUTER_API_KEY");

    const details = await dispatchCliCommand(["model", "--profiles-path", profilesPath, "--details"], {
      env: { OPENROUTER_API_KEY: "configured-provider-key" },
    });
    expect(details.output).toContain("Env: OPENROUTER_API_KEY (configured)");
  });

  test("routes model through the default private setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-model-default-env-"));
    const profilesPath = join(root, "provider-profiles.json");
    const previousCwd = process.cwd();
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
    write(
      join(root, "live-readiness.local.env"),
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export OPENROUTER_API_KEY="configured-provider-key"',
      ].join("\n"),
    );

    try {
      process.chdir(root);
      const result = await dispatchCliCommand(["model"], { env: {} });

      expect(result.command).toBe("model");
      expect(result.result).toMatchObject({ ok: true, profilesPath });
      expect(result.output).toContain("[ok] openrouter");
      expect(result.output).not.toContain("OPENROUTER_API_KEY");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes tools through the read-only tool safety dashboard", async () => {
    const result = await dispatchCliCommand(["tools"]);
    const help = await dispatchCliCommand(["tools", "--help"]);

    expect(result.command).toBe("tools");
    expect(result.output).toContain("Vivarium Tools");
    expect(result.output).toContain("External toolsets");
    expect(result.output).toContain("terminal.run");
    expect(result.output).toContain("Tool policies: approve unless configured otherwise");
    expect(result.output).toContain("commandPrefix: git status");
    expect(result.output).toContain("vivarium model");
    expect(help.command).toBe("tools");
    expect(help.output).toContain("Vivarium Tools");
    expect(help.output).toContain("Read-only dashboard");
  });

  test("routes connect through provider signup guidance", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-guide-"));
    const previousCwd = process.cwd();

    try {
      process.chdir(root);
      const result = await dispatchCliCommand(["connect"], { env: { HOME: root } });

      expect(result.command).toBe("connect");
      expect(result.output).toContain("Vivarium Connect");
      expect(result.output).toContain("https://console.anthropic.com/settings/keys");
      expect(result.output).toContain("https://openrouter.ai/keys");
      expect(result.output).toContain("vivarium setup live");
      expect(result.output).toContain("vivarium connect signup");
      expect(result.output).toContain("vivarium connect setup --confirm-write");
      expect(result.output).toContain("vivarium proof init");
      expect(result.output).toContain("vivarium doctor --live");
      expect(result.output).toContain("Re-run with --details");
      expect(result.output).not.toContain("vivarium live env-init --path live-readiness.local.env");
      expect(result.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");

      const detailed = await dispatchCliCommand(["connect", "--details"], { env: { HOME: root } });
      expect(detailed.command).toBe("connect");
      expect(detailed.output).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
      expect(detailed.output).toContain("providers configure --profiles-path");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes connect signup through a signup-first handoff", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-signup-"));
    const previousCwd = process.cwd();

    try {
      process.chdir(home);
      const result = await dispatchCliCommand(["connect", "signup"], { env: { HOME: home } });

      expect(result.command).toBe("connect");
      expect(result.output).toContain("Vivarium Connect Signup");
      expect(result.output).toContain("Accounts and keys");
      expect(result.output).toContain("https://console.anthropic.com/settings/keys");
      expect(result.output).toContain("https://openrouter.ai/keys");
      expect(result.output).toContain("Private OpenAI-compatible");
      expect(result.output).toContain("vivarium setup live");
      expect(result.output).toContain("vivarium connect");
      expect(result.output).toContain("vivarium connect fill");
      expect(result.output).toContain("vivarium connect setup --confirm-write");
      expect(result.output).toContain("vivarium connect smoke");
      expect(result.output).toContain("vivarium proof init");
      expect(result.output).toContain("vivarium proof");
      expect(result.output).toContain("vivarium doctor --live");
      expect(result.output).not.toContain("ANTHROPIC_API_KEY");
      expect(result.output).not.toContain("providers configure --profiles-path");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes connect signup without already configured local source files", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-signup-configured-"));
    const envPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const evidencePath = join(home, ".vivarium", "live", "v1-evidence.json");
    write(evidencePath, "{}\n");
    write(
      envPath,
      [
        'export VIVARIUM_AGENT_REPO_NAME="vivarium-agent"',
        'export VIVARIUM_WORLD_REPO_NAME="vivarium-world"',
        'export VIVARIUM_CANONICAL_WORLD_REF="https://github.com/idanmann10/vivarium-world.git"',
        'export VIVARIUM_PRIVATE_WORLD_REF="/Users/idanmann/.vivarium/private-world"',
        'export GITHUB_TOKEN="ghp_ready"',
        'export VIVARIUM_GITHUB_OWNER="idanmann10"',
        'export VIVARIUM_GITHUB_REPOSITORY_ID="R_123"',
        'export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID="DIC_123"',
        `export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"`,
        "",
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["connect", "signup"], { env: { HOME: home } });

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Local value map");
    expect(result.output).toContain("Provider accounts:");
    expect(result.output).toContain("Internal credential:");
    expect(result.output).not.toContain("  Names and worlds:");
    expect(result.output).not.toContain("    Agent repo name: ~/.vivarium/secrets/agent-repo-name.txt");
    expect(result.output).not.toContain("    GitHub token: ~/.vivarium/secrets/github-token.key");
    expect(result.output).not.toContain("    GitHub owner: ~/.vivarium/secrets/github-owner.txt");
    expect(result.output).not.toContain("\n      vivarium proof init\n");
    expect(result.output).toContain("\n      vivarium proof\n");
  });

  test("routes connect wizard through a single guided live setup entrypoint", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-"));
    const envPath = join(root, "live-readiness.local.env");
    const previousCwd = process.cwd();

    try {
      process.chdir(root);
      const created = await dispatchCliCommand(["connect", "wizard"], { env: { HOME: root } });
      const reused = await dispatchCliCommand(["connect", "wizard"], { env: { HOME: root } });

      expect(created.command).toBe("connect");
      expect(created.result).toMatchObject({
        envFilePath: "live-readiness.local.env",
        setupFileStatus: "created",
      });
      expect(created.output).toContain("Vivarium Connect Wizard");
      expect(created.output).toContain("Status: setup file created");
      expect(created.output).toContain("Setup file: live-readiness.local.env");
      expect(created.output).toContain("Anthropic: https://console.anthropic.com/settings/keys");
      expect(created.output).toContain("OpenRouter: https://openrouter.ai/keys");
      expect(created.output).toContain("Private OpenAI-compatible: ask for endpoint URL, model, context window, and API key");
      expect(created.output).toContain("vivarium connect fill");
      expect(created.output).toContain("vivarium connect setup --confirm-write");
      expect(created.output).toContain("vivarium connect smoke");
      expect(created.output).toContain("vivarium proof init");
      expect(created.output).toContain("vivarium doctor --live");
      expect(created.output).not.toContain("ANTHROPIC_API_KEY");
      expect(created.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
      expect(statSync(envPath).mode & 0o777).toBe(0o600);

      expect(reused.result).toMatchObject({
        envFilePath: "live-readiness.local.env",
        setupFileStatus: "existing",
      });
      expect(reused.output).toContain("Status: setup file already exists");
      expect(reused.output).toContain("Existing setup file reused.");
      expect(reused.output).not.toContain("Pass --overwrite");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes connect wizard through friendly file-backed setup values", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-fill-"));
    const envPath = join(root, "live-readiness.local.env");
    const anthropicKeyPath = join(root, "anthropic.key");
    const openRouterKeyPath = join(root, "openrouter.key");
    const privateKeyPath = join(root, "private.key");
    const masterKeyPath = join(root, "master.key");
    const internalTokenPath = join(root, "internal.token");
    write(anthropicKeyPath, "anthropic-secret\n");
    write(openRouterKeyPath, "openrouter-secret\n");
    write(privateKeyPath, "private-secret\n");
    write(masterKeyPath, "master-secret\n");
    write(internalTokenPath, "internal-secret\n");

    const result = await dispatchCliCommand([
      "connect",
      "wizard",
      "--path",
      envPath,
      "--anthropic-key-file",
      anthropicKeyPath,
      "--openrouter-key-file",
      openRouterKeyPath,
      "--private-key-file",
      privateKeyPath,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--credential-master-key-file",
      masterKeyPath,
      "--internal-token-file",
      internalTokenPath,
      "--internal-health-url",
      "https://internal.example/health",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(result.command).toBe("connect");
    expect(result.result).toMatchObject({
      envFilePath: envPath,
      setupFileStatus: "created",
      fillResult: { ok: true, written: true, envFilePath: envPath },
    });
    expect(body).toContain('export ANTHROPIC_API_KEY="anthropic-secret"');
    expect(body).toContain('export OPENROUTER_API_KEY="openrouter-secret"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_MODEL="private-model"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"');
    expect(body).toContain('export VIVARIUM_CREDENTIALS_MASTER_KEY="master-secret"');
    expect(body).toContain('export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"');
    expect(body).toContain('export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"');
    expect(result.output).toContain("Vivarium Connect Wizard");
    expect(result.output).toContain("Filled setup values:");
    expect(result.output).toContain("Anthropic: API key");
    expect(result.output).toContain("OpenRouter: API key");
    expect(result.output).toContain("Private OpenAI-compatible: API key, base URL, model, context window");
    expect(result.output).toContain("Internal credential: master key, credential value, health URL");
    expect(result.output).toContain(`vivarium connect --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain(`vivarium connect fill --env-file ${envPath}`);
    expect(result.output).not.toContain("anthropic-secret");
    expect(result.output).not.toContain("openrouter-secret");
    expect(result.output).not.toContain("internal-secret");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("routes connect wizard confirm-write through guarded live setup writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-write-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "generated", "provider-profiles.json");
    const credentialsPath = join(root, "generated", "credentials.enc");
    const evidencePath = join(root, "generated", "v1-evidence.json");
    const anthropicKeyPath = join(root, "anthropic.key");
    const openRouterKeyPath = join(root, "openrouter.key");
    const privateKeyPath = join(root, "private.key");
    const masterKeyPath = join(root, "master.key");
    const internalTokenPath = join(root, "internal.token");
    write(anthropicKeyPath, "anthropic-secret\n");
    write(openRouterKeyPath, "openrouter-secret\n");
    write(privateKeyPath, "private-secret\n");
    write(masterKeyPath, "master-secret\n");
    write(internalTokenPath, "internal-secret\n");

    const result = await dispatchCliCommand([
      "connect",
      "wizard",
      "--path",
      envPath,
      "--provider-profiles-path",
      profilesPath,
      "--credentials-path",
      credentialsPath,
      "--evidence-path",
      evidencePath,
      "--internal-credential-name",
      "INTERNAL_API_TOKEN",
      "--anthropic-key-file",
      anthropicKeyPath,
      "--openrouter-key-file",
      openRouterKeyPath,
      "--private-key-file",
      privateKeyPath,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--credential-master-key-file",
      masterKeyPath,
      "--internal-token-file",
      internalTokenPath,
      "--internal-health-url",
      "https://internal.example/health",
      "--confirm-write",
    ]);
    const profiles = JSON.parse(readFileSync(profilesPath, "utf8")) as {
      readonly profiles: readonly { readonly name: string; readonly apiKeyEnv: string }[];
    };
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as { readonly realGoals: readonly unknown[] };
    const credentialBody = readFileSync(credentialsPath, "utf8");

    expect(result.command).toBe("connect");
    expect(result.result).toMatchObject({
      envFilePath: envPath,
      setupFileStatus: "created",
      fillResult: { ok: true, written: true, envFilePath: envPath },
      setupResult: {
        ok: true,
        written: true,
        providerProfiles: ["anthropic-main", "openrouter", "private-finetune"],
        credentialName: "INTERNAL_API_TOKEN",
        paths: {
          providerProfilesPath: profilesPath,
          credentialsPath,
          evidenceManifestPath: evidencePath,
        },
      },
    });
    expect(profiles.profiles.map((profile) => profile.name)).toEqual([
      "anthropic-main",
      "openrouter",
      "private-finetune",
    ]);
    expect(profiles.profiles.map((profile) => profile.apiKeyEnv)).toEqual([
      "ANTHROPIC_API_KEY",
      "OPENROUTER_API_KEY",
      "VIVARIUM_OAI_COMPAT_API_KEY",
    ]);
    expect(evidence.realGoals).toEqual([]);
    expect(existsSync(credentialsPath)).toBe(true);
    expect(credentialBody).not.toContain("internal-secret");
    expect(result.output).toContain("Live setup written:");
    expect(result.output).toContain("Provider profiles: anthropic-main, openrouter, private-finetune");
    expect(result.output).toContain(`Provider profile file: ${profilesPath}`);
    expect(result.output).toContain(`Credential store: ${credentialsPath}`);
    expect(result.output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(result.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(result.output).not.toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain(`vivarium connect fill --env-file ${envPath}`);
    expect(result.output).not.toContain("anthropic-secret");
    expect(result.output).not.toContain("openrouter-secret");
    expect(result.output).not.toContain("internal-secret");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("routes connect wizard setup-dir through default generated artifact paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-setup-dir-"));
    const envPath = join(root, "live-readiness.local.env");
    const setupDir = join(root, "setup");
    const profilesPath = join(setupDir, "provider-profiles.json");
    const credentialsPath = join(setupDir, "credentials.enc");
    const evidencePath = join(setupDir, "v1-evidence.json");
    const anthropicKeyPath = join(root, "anthropic.key");
    const openRouterKeyPath = join(root, "openrouter.key");
    const privateKeyPath = join(root, "private.key");
    const masterKeyPath = join(root, "master.key");
    const internalTokenPath = join(root, "internal.token");
    write(anthropicKeyPath, "anthropic-secret\n");
    write(openRouterKeyPath, "openrouter-secret\n");
    write(privateKeyPath, "private-secret\n");
    write(masterKeyPath, "master-secret\n");
    write(internalTokenPath, "internal-secret\n");

    const result = await dispatchCliCommand([
      "connect",
      "wizard",
      "--path",
      envPath,
      "--setup-dir",
      setupDir,
      "--anthropic-key-file",
      anthropicKeyPath,
      "--openrouter-key-file",
      openRouterKeyPath,
      "--private-key-file",
      privateKeyPath,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--credential-master-key-file",
      masterKeyPath,
      "--internal-token-file",
      internalTokenPath,
      "--internal-health-url",
      "https://internal.example/health",
      "--confirm-write",
    ]);
    const body = readFileSync(envPath, "utf8");
    const profiles = JSON.parse(readFileSync(profilesPath, "utf8")) as {
      readonly profiles: readonly { readonly name: string }[];
    };

    expect(result.command).toBe("connect");
    expect(result.result).toMatchObject({
      envFilePath: envPath,
      setupFileStatus: "created",
      fillResult: { ok: true, written: true, envFilePath: envPath },
      setupResult: {
        ok: true,
        written: true,
        credentialName: "INTERNAL_API_TOKEN",
        paths: {
          providerProfilesPath: profilesPath,
          credentialsPath,
          evidenceManifestPath: evidencePath,
        },
      },
    });
    expect(body).toContain(`export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`);
    expect(body).toContain(`export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`);
    expect(body).toContain('export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"');
    expect(body).toContain(`export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"`);
    expect(profiles.profiles.map((profile) => profile.name)).toEqual([
      "anthropic-main",
      "openrouter",
      "private-finetune",
    ]);
    expect(existsSync(credentialsPath)).toBe(true);
    expect(existsSync(evidencePath)).toBe(true);
    expect(result.output).toContain("Provider profiles: profile file path");
    expect(result.output).toContain("Internal credential: credential store path, master key, credential name, credential value, health URL");
    expect(result.output).toContain("V1 evidence: manifest path");
    expect(result.output).toContain(`Provider profile file: ${profilesPath}`);
    expect(result.output).toContain(`Credential store: ${credentialsPath}`);
    expect(result.output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(result.output).not.toContain("anthropic-secret");
    expect(result.output).not.toContain("internal-secret");
    expect(result.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
  });

  test("routes connect wizard secrets-dir through default secret file names", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-secrets-dir-"));
    const envPath = join(root, "live-readiness.local.env");
    const setupDir = join(root, "setup");
    const secretsDir = join(root, "secrets");
    const profilesPath = join(setupDir, "provider-profiles.json");
    const credentialsPath = join(setupDir, "credentials.enc");
    const evidencePath = join(setupDir, "v1-evidence.json");
    write(join(secretsDir, "anthropic.key"), "anthropic-secret\n");
    write(join(secretsDir, "openrouter.key"), "openrouter-secret\n");
    write(join(secretsDir, "private-oai.key"), "private-secret\n");
    write(join(secretsDir, "credential-master.key"), "master-secret\n");
    write(join(secretsDir, "internal-api.token"), "internal-secret\n");

    const result = await dispatchCliCommand([
      "connect",
      "wizard",
      "--path",
      envPath,
      "--setup-dir",
      setupDir,
      "--secrets-dir",
      secretsDir,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--internal-health-url",
      "https://internal.example/health",
      "--confirm-write",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(result.command).toBe("connect");
    expect(result.result).toMatchObject({
      envFilePath: envPath,
      setupFileStatus: "created",
      fillResult: { ok: true, written: true, envFilePath: envPath },
      setupResult: {
        ok: true,
        written: true,
        paths: {
          providerProfilesPath: profilesPath,
          credentialsPath,
          evidenceManifestPath: evidencePath,
        },
      },
    });
    expect(body).toContain('export ANTHROPIC_API_KEY="anthropic-secret"');
    expect(body).toContain('export OPENROUTER_API_KEY="openrouter-secret"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_API_KEY="private-secret"');
    expect(body).toContain('export VIVARIUM_CREDENTIALS_MASTER_KEY="master-secret"');
    expect(body).toContain('export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"');
    expect(existsSync(profilesPath)).toBe(true);
    expect(existsSync(credentialsPath)).toBe(true);
    expect(existsSync(evidencePath)).toBe(true);
    expect(result.output).toContain("Anthropic: API key");
    expect(result.output).toContain("OpenRouter: API key");
    expect(result.output).toContain("Internal credential: credential store path, master key, credential name, credential value, health URL");
    expect(result.output).not.toContain("anthropic-secret");
    expect(result.output).not.toContain("internal-secret");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("routes connect wizard secrets-dir through missing secret file scaffolding", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-wizard-secret-scaffold-"));
    const envPath = join(root, "live-readiness.local.env");
    const setupDir = join(root, "setup");
    const secretsDir = join(root, "secrets");
    const expectedSecretFiles = [
      "agent-repo-name.txt",
      "world-repo-name.txt",
      "canonical-world-ref.txt",
      "private-world-ref.txt",
      "github-token.key",
      "github-owner.txt",
      "github-repository-id.txt",
      "github-discussion-category-id.txt",
      "anthropic.key",
      "openrouter.key",
      "private-oai.key",
      "private-base-url.txt",
      "private-model.txt",
      "private-context-window.txt",
      "credential-master.key",
      "internal-api.token",
      "internal-health-url.txt",
    ].map((name) => join(secretsDir, name));

    const result = await dispatchCliCommand([
      "connect",
      "wizard",
      "--path",
      envPath,
      "--setup-dir",
      setupDir,
      "--secrets-dir",
      secretsDir,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--internal-health-url",
      "https://internal.example/health",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(result.command).toBe("connect");
    expect(result.result).toMatchObject({
      envFilePath: envPath,
      setupFileStatus: "created",
      secretFiles: {
        directory: secretsDir,
        files: expectedSecretFiles.map((path) => ({ path, status: "created" })),
      },
      fillResult: { ok: true, written: true, envFilePath: envPath },
    });
    for (const path of expectedSecretFiles) {
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toBe("");
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
    expect(body).toContain(`export VIVARIUM_PROVIDER_PROFILES_PATH="${join(setupDir, "provider-profiles.json")}"`);
    expect(body).toContain(`export VIVARIUM_CREDENTIALS_PATH="${join(setupDir, "credentials.enc")}"`);
    expect(body).toContain(`export VIVARIUM_V1_EVIDENCE_PATH="${join(setupDir, "v1-evidence.json")}"`);
    expect(body).not.toContain('export ANTHROPIC_API_KEY=""');
    expect(result.output).toContain("Local setup files created:");
    expect(result.output).toContain(`Agent repo name: ${join(secretsDir, "agent-repo-name.txt")}`);
    expect(result.output).toContain(`GitHub token: ${join(secretsDir, "github-token.key")}`);
    expect(result.output).toContain(`Anthropic API key: ${join(secretsDir, "anthropic.key")}`);
    expect(result.output).toContain(`Internal API token: ${join(secretsDir, "internal-api.token")}`);
    expect(result.output).toContain("Paste each value into its file, then rerun the same wizard command.");
    expect(result.output).toContain(`vivarium connect wizard --path ${envPath} --secrets-dir ${secretsDir}`);
    expect(result.output).toContain(`--setup-dir ${setupDir}`);
    expect(result.output).not.toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("routes connect init through private live env file creation", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-init-"));
    const envPath = join(root, "live-readiness.local.env");

    const created = await dispatchCliCommand(["connect", "init", "--path", envPath]);
    const mode = statSync(envPath).mode & 0o777;

    expect(created.command).toBe("connect");
    expect(created.result).toEqual({
      ok: true,
      written: true,
      path: envPath,
      mode: "0600",
      templatePath: "docs/live-readiness.env.example",
      prefilled: [],
    });
    expect(created.output).toContain("Vivarium Connect Init");
    expect(created.output).toContain("Status: written");
    expect(created.output).toContain(`Env file: ${envPath}`);
    expect(created.output).toContain("Permissions: 0600");
    expect(created.output).toContain("vivarium connect signup");
    expect(created.output).toContain(`vivarium connect --env-file ${envPath}`);
    expect(created.output).toContain(`vivarium connect fill --env-file ${envPath}`);
    expect(created.output).toContain(`vivarium connect setup --env-file ${envPath}`);
    expect(created.output).toContain(
      [
        "  [1] Open account and key handoff",
        "      vivarium connect signup",
        "  [2] Review live readiness",
        `      vivarium connect --env-file ${envPath}`,
        "  [3] Fill live settings",
        `      Edit ${envPath} locally. Keep it out of git.`,
        `      Or use vivarium connect fill --env-file ${envPath} with friendly labels.`,
        "  [4] Prepare live readiness",
        `      vivarium connect fill --env-file ${envPath}`,
        `      vivarium connect setup --env-file ${envPath} --confirm-write`,
      ].join("\n"),
    );
    expect(created.output).toContain(`vivarium proof init --env-file ${envPath}`);
    expect(created.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(created.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(created.output).not.toContain("Vivarium Live Env");
    expect(mode).toBe(0o600);
  });

  test("routes pathless connect init to the default private setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-init-default-"));
    const envPath = join(root, "live-readiness.local.env");
    const previousCwd = process.cwd();

    try {
      process.chdir(root);
      const created = await dispatchCliCommand(["connect", "init"]);

      expect(created.command).toBe("connect");
      expect(created.result).toMatchObject({
        ok: true,
        written: true,
        path: "live-readiness.local.env",
      });
      expect(created.output).toContain("Vivarium Connect Init");
      expect(created.output).toContain("Status: written");
      expect(created.output).toContain("Env file: live-readiness.local.env");
      expect(created.output).toContain("vivarium connect signup");
      expect(created.output).toContain("vivarium connect");
      expect(created.output).not.toContain("vivarium connect --env-file live-readiness.local.env");
      expect(statSync(envPath).mode & 0o777).toBe(0o600);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes default connect follow-ups through the default private setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-default-flow-"));
    const previousCwd = process.cwd();

    try {
      process.chdir(root);
      await dispatchCliCommand(["connect", "init"], { env: { HOME: root } });

      const fill = await dispatchCliCommand(["connect", "fill"], { env: { HOME: root } });
      const setup = await dispatchCliCommand(["connect", "setup"], { env: { HOME: root } });
      const smoke = await dispatchCliCommand(["connect", "smoke"], { env: { HOME: root } });

      expect(fill.command).toBe("connect");
      expect(fill.output).toContain("Vivarium Connect Fill");
      expect(fill.output).toContain("Setup file: live-readiness.local.env");
      expect(fill.output).toContain("No setup values supplied");

      expect(setup.command).toBe("connect");
      expect(setup.output).toContain("Vivarium Connect Setup");
      expect(setup.output).toContain("Setup file: live-readiness.local.env");
      expect(setup.output).toContain("Status: blocked");

      expect(smoke.command).toBe("connect");
      expect(smoke.output).toContain("Vivarium Connect Smoke");
      expect(smoke.output).toContain("Setup file: live-readiness.local.env");
      expect(smoke.output).toContain("Status: blocked");
      expect(smoke.output).toContain("vivarium setup live");
      expect(smoke.output).toContain(
        [
          "  [1] Prepare live readiness",
          "      vivarium setup live",
          "      vivarium connect",
          "      vivarium connect signup",
          "      vivarium connect fill",
          "      vivarium connect setup --confirm-write",
        ].join("\n"),
      );
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes live doctor through the default private setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-default-env-"));
    const envPath = join(root, "live-readiness.local.env");
    const previousCwd = process.cwd();
    write(
      envPath,
      [
        "# Filled from docs/live-readiness.env.example",
        'export VIVARIUM_AGENT_REPO_NAME="agent-final"',
        'export VIVARIUM_WORLD_REPO_NAME="world-final"',
        'export ANTHROPIC_API_KEY="configured"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
        'export GITHUB_TOKEN="configured"',
      ].join("\n"),
    );
    chmodSync(envPath, 0o600);

    try {
      process.chdir(root);
      const result = await dispatchCliCommand(
        ["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"],
        { doctorRunner: deterministicDoctorRunner, env: {} },
      );
      const checks = (result.result as { checks: readonly string[] }).checks;

      expect(result.command).toBe("doctor");
      expect(checks).toEqual(
        expect.arrayContaining([
          "liveEnvFile.permissions:configured",
          "agent.name:configured",
          "world.name:configured",
          "provider.anthropic:configured",
          "provider.anthropicModel:configured",
          "provider.anthropicContextWindow:configured",
          "github.env:configured",
        ]),
      );
      expect(result.output).toContain("Command: vivarium connect fill");
      expect(result.output).not.toContain("Command: vivarium connect fill --env-file live-readiness.local.env");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("keeps live doctor actions short for the default private setup file", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-private-env-"));
    const envPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    write(
      envPath,
      [
        "# Filled from docs/live-readiness.env.example",
        'export VIVARIUM_V1_EVIDENCE_PATH="' + join(home, ".vivarium", "live", "v1-evidence.json") + '"',
      ].join("\n"),
    );
    chmodSync(envPath, 0o600);

    const result = await dispatchCliCommand(
      ["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"],
      { doctorRunner: deterministicDoctorRunner, env: { HOME: home } },
    );

    expect(result.command).toBe("doctor");
    expect(result.output).toContain("Command: vivarium setup live");
    expect(result.output).not.toContain("Command: vivarium onboard live");
    expect(result.output).toContain("Command: vivarium connect fill");
    expect(result.output).toContain("then run vivarium connect setup");
    expect(result.output).toContain("Command: vivarium connect smoke");
    expect(result.output).toContain("Command: vivarium proof init");
    expect(result.output).not.toContain("vivarium connect wizard --path");
    expect(result.output).not.toContain(`--env-file "${envPath}"`);
  });

  test("routes connect through a setup file without printing raw provider keys", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-env-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        'export ANTHROPIC_API_KEY="anthropic-key"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
        'export OPENROUTER_API_KEY="<redacted-openrouter-key>"',
        'export VIVARIUM_OPENROUTER_MODEL=""',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="0"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-key"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"',
        'export VIVARIUM_CREDENTIALS_PATH="/tmp/credentials.enc"',
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="<redacted-internal-api-token>"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL=""',
        `export VIVARIUM_V1_EVIDENCE_PATH="${join(root, "v1-evidence.json")}"`,
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["connect", "--env-file", envPath]);

    expect(result.command).toBe("connect");
    expect(result.output).toContain(`Setup file: ${envPath}`);
    expect(result.output).toContain("Provider readiness: 2/3 ready");
    expect(result.output).toContain("[needs] OpenRouter: API key, model, context window");
    expect(result.output).toContain("Internal credential readiness: 3/5 ready");
    expect(result.output).toContain("[needs] Internal credential: credential value, health URL");
    expect(result.output).toContain("V1 evidence readiness: 1/2 ready");
    expect(result.output).toContain("[needs] V1 evidence file: evidence manifest file");
    expect(result.output).toContain("doctor --live checks the required v1 evidence content");
    expect(result.output).not.toContain(`vivarium live evidence-init --path ${join(root, "v1-evidence.json")}`);
    expect(result.output).toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
    expect(result.output).not.toContain("OPENROUTER_API_KEY");
    expect(result.output).not.toContain("VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE");
    expect(result.output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
  });

  test("routes connect setup through live setup writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-setup-"));
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    const evidencePath = join(root, "v1-evidence.json");
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-key"',
        'export OPENROUTER_API_KEY="openrouter-key"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-key"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/auto"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="2000000"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="test-master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
        `export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"`,
      ].join("\n"),
    );

    const result = await dispatchCliCommand([
      "connect",
      "setup",
      "--env-file",
      envPath,
      "--confirm-write",
    ]);

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Live Setup");
    expect(result.output).toContain("Status: written");
    expect(result.output).toContain("Provider profiles: anthropic-main, openrouter, private-finetune");
    expect(result.output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(result.output).toContain(`vivarium model --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(result.output).not.toContain(`source ${envPath}`);
    expect(result.output).not.toContain("vivarium providers smoke --profiles-path");
    expect(result.output).not.toContain("vivarium credentials smoke --path");
    expect(readFileSync(profilesPath, "utf8")).toContain("anthropic-main");
    expect(readFileSync(credentialsPath, "utf8")).not.toContain("internal-secret");
    expect(readFileSync(evidencePath, "utf8")).toContain('"realGoals": []');
  });

  test("keeps default private connect setup follow-ups on short commands", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-setup-private-"));
    const setupDir = join(home, ".vivarium", "live");
    const profilesPath = join(setupDir, "provider-profiles.json");
    const credentialsPath = join(setupDir, "credentials.enc");
    const evidencePath = join(setupDir, "v1-evidence.json");
    const envPath = join(setupDir, "live-readiness.local.env");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-key"',
        'export OPENROUTER_API_KEY="openrouter-key"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-key"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/auto"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="2000000"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="test-master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
        `export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"`,
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["connect", "setup", "--confirm-write"], {
      env: { HOME: home },
    });

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Live Setup");
    expect(result.output).toContain("Status: written");
    expect(result.output).toContain("vivarium model");
    expect(result.output).toContain("vivarium connect smoke");
    expect(result.output).toContain("vivarium proof");
    expect(result.output).toContain("vivarium doctor --live");
    expect(result.output).not.toContain(`--env-file ${envPath}`);
  });

  test("routes connect fill through friendly setup labels", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-fill-"));
    const envPath = join(root, "live-readiness.local.env");
    const anthropicKeyPath = join(root, "anthropic.key");
    const openRouterKeyPath = join(root, "openrouter.key");
    const privateKeyPath = join(root, "private.key");
    const masterKeyPath = join(root, "master.key");
    const internalTokenPath = join(root, "internal.token");
    write(anthropicKeyPath, "anthropic-key\n");
    write(openRouterKeyPath, "openrouter-key\n");
    write(privateKeyPath, "private-key\n");
    write(masterKeyPath, "master-key\n");
    write(internalTokenPath, "internal-secret\n");
    write(
      envPath,
      [
        'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"',
        'export OPENROUTER_API_KEY="<redacted-openrouter-key>"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="<redacted-private-oai-compatible-key>"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="<private-oai-compatible-base-url>"',
        'export VIVARIUM_OAI_COMPAT_MODEL="<private-fine-tune-model>"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="<private-context-window>"',
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="<local-master-key>"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="<redacted-internal-api-token>"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="<internal-api-health-url>"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand([
      "connect",
      "fill",
      "--env-file",
      envPath,
      "--anthropic-key-file",
      anthropicKeyPath,
      "--openrouter-key-file",
      openRouterKeyPath,
      "--private-key-file",
      privateKeyPath,
      "--private-base-url",
      "https://private.example/v1",
      "--private-model",
      "private-model",
      "--private-context-window",
      "128000",
      "--credential-master-key-file",
      masterKeyPath,
      "--internal-token-file",
      internalTokenPath,
      "--internal-health-url",
      "https://internal.example/health",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Connect Fill");
    expect(result.output).toContain("Private OpenAI-compatible: API key, base URL, model, context window");
    expect(result.output).toContain("Internal credential: master key, credential value, health URL");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
    expect(result.output).not.toContain("anthropic-key");
    expect(result.output).not.toContain("internal-secret");
    expect(body).toContain('export ANTHROPIC_API_KEY="anthropic-key"');
    expect(body).toContain('export OPENROUTER_API_KEY="openrouter-key"');
    expect(body).toContain('export VIVARIUM_OAI_COMPAT_API_KEY="private-key"');
    expect(body).toContain('export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"');
  });

  test("routes empty connect fill to safe file-input examples", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-fill-empty-"));
    const envPath = join(root, "live-readiness.local.env");
    write(envPath, 'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"\n');

    const result = await dispatchCliCommand(["connect", "fill", "--env-file", envPath]);

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Connect Fill");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("Fill examples:");
    expect(result.output).toContain("--secrets-dir ~/.vivarium/secrets");
    expect(result.output).toContain("--setup-dir ~/.vivarium/live");
    expect(result.output).not.toContain("--anthropic-key-file ~/.vivarium/secrets/anthropic.key");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
    expect(result.output).not.toContain("--anthropic-key anthropic-key");
  });

  test("routes connect smoke through filled setup-file smokes", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-smoke-"));
    const profilesPath = join(root, "provider-profiles.json");
    const credentialsPath = join(root, "credentials.enc");
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="anthropic-key"',
        'export OPENROUTER_API_KEY="openrouter-key"',
        'export VIVARIUM_OAI_COMPAT_API_KEY="private-key"',
        'export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE="anthropic-main"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
        'export VIVARIUM_OPENROUTER_PROVIDER_PROFILE="openrouter"',
        'export VIVARIUM_OPENROUTER_MODEL="openrouter/auto"',
        'export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"',
        'export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="2000000"',
        'export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE="private-finetune"',
        'export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"',
        'export VIVARIUM_OAI_COMPAT_MODEL="private-model"',
        'export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"',
        `export VIVARIUM_CREDENTIALS_PATH="${credentialsPath}"`,
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="test-master-key"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME="INTERNAL_API_TOKEN"',
        'export VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE="internal-secret"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"',
      ].join("\n"),
    );
    await dispatchCliCommand(["connect", "setup", "--env-file", envPath, "--confirm-write"]);

    const result = await dispatchCliCommand(
      ["connect", "smoke", "--env-file", envPath],
      {
        providerFetch: async (url) =>
          new URL(url).hostname === "api.anthropic.com"
            ? Response.json({ content: [{ type: "text", text: "anthropic ok" }] })
            : Response.json({ choices: [{ message: { content: "compat ok" } }] }),
        credentialFetch: async () => Response.json({ ok: true }),
      },
    );

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Connect Smoke");
    expect(result.output).toContain("[ok] Anthropic provider");
    expect(result.output).toContain("[ok] OpenRouter provider");
    expect(result.output).toContain("[ok] Private OpenAI-compatible provider");
    expect(result.output).toContain("[ok] Internal credential");
    expect(result.output).not.toContain("internal-secret");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
  });

  test("keeps blocked connect setup output on plain-language labels by default", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-setup-blocked-"));
    const envPath = join(root, "live-readiness.local.env");
    write(
      envPath,
      [
        'export ANTHROPIC_API_KEY="<redacted-anthropic-key>"',
        'export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"',
        'export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["connect", "setup", "--env-file", envPath]);

    expect(result.command).toBe("connect");
    expect(result.output).toContain("Vivarium Connect Setup");
    expect(result.output).toContain("Status: blocked");
    expect(result.output).toContain("Signup links:");
    expect(result.output).toContain("Anthropic: https://console.anthropic.com/settings/keys");
    expect(result.output).toContain("OpenRouter: https://openrouter.ai/keys");
    expect(result.output).toContain("Provider setup");
    expect(result.output).toContain("Encrypted credentials/internal API");
    expect(result.output).toContain(`vivarium connect --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium connect setup --env-file ${envPath}`);
    expect(result.output).not.toContain(`vivarium connect setup --env-file ${envPath} --details`);
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
    expect(result.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(result.output).not.toContain("VIVARIUM_CREDENTIALS_PATH");

    const detailed = await dispatchCliCommand([
      "connect",
      "setup",
      "--env-file",
      envPath,
      "--details",
    ]);

    expect(detailed.output).toContain("Vivarium Connect Setup");
    expect(detailed.output).toContain("Exact setup fields:");
    expect(detailed.output).toContain("ANTHROPIC_API_KEY");
    expect(detailed.output).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(detailed.output).toContain("VIVARIUM_CREDENTIALS_PATH");
    expect(detailed.output).not.toContain("Vivarium Live Setup");
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
    write(
      envPath,
      [
        `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"`,
        'export ANTHROPIC_API_KEY="configured-provider-key"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["model", "--env-file", envPath], {
      env: {},
    });

    expect(result.command).toBe("model");
    expect(result.result).toMatchObject({ ok: true, profilesPath });
    expect(result.output).toContain("Vivarium Model");
    expect(result.output).toContain("[ok] anthropic-main");
    expect(result.output).toContain("claude-test");
  });

  test("keeps model setup guidance on the selected live env file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-model-empty-env-"));
    const profilesPath = join(root, "provider-profiles.json");
    const envPath = join(root, "custom-live-readiness.local.env");
    write(profilesPath, `${JSON.stringify({ profiles: [] })}\n`);
    write(envPath, `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"\n`);

    const result = await dispatchCliCommand(["model", "--env-file", envPath], {
      env: {},
    });

    expect(result.command).toBe("model");
    expect(result.result).toMatchObject({
      ok: false,
      profilesPath,
      problem: "no_profiles",
    });
    expect(result.output).toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain(`vivarium live setup --env-file ${envPath} --confirm-write`);
    expect(result.output).not.toContain(
      "vivarium setup --env-file live-readiness.local.env --confirm-write",
    );
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
        expect.stringContaining("local run"),
        "vivarium launch handoff",
        "vivarium status",
        "vivarium tools",
        "vivarium help",
        "vivarium update",
      ]),
    });
    expect(localSkills).toEqual([expect.objectContaining({ name: "Red Green", domain: "coding" })]);
    expect(setup.output).toContain("Vivarium Setup");
    expect(setup.output).toContain("VIVARIUM // local memory // world culture");
    expect(setup.output).toContain("Local state initialized");
    expect(setup.output).toContain("Next commands");
    expect(setup.output).toContain("[1] Run the local agent");
    expect(setup.output).toContain("[2] Review launch handoff");
    expect(setup.output).toContain("[3] Keep moving");
    expect(setup.output).toContain("vivarium local run");
    expect(setup.output).not.toContain("vivarium run --goal");
    expect(setup.output).toContain("vivarium launch handoff");
    expect(setup.output).toContain("vivarium status");
    expect(setup.output).toContain("vivarium tools");
    expect(setup.output).toContain("vivarium help");
    expect(setup.output).toContain("vivarium update");
    expect(setup.output).not.toContain("live env-init --path live-readiness.local.env");
    expect(setup.output).not.toContain("vivarium setup --env-file live-readiness.local.env");
    expect(setup.output).not.toContain("vivarium model --env-file live-readiness.local.env");
    expect(setup.output).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(setup.output).not.toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(setup.output).not.toContain("bun apps/cli/src/main.ts");
    expect(setup.output).not.toContain("cp docs/live-readiness.env.example");
    expect(setup.output).not.toContain("chmod 600 live-readiness.local.env");
  });

  test("routes top-level --setup through local setup with a localhost dashboard hint", async () => {
    const worldRoot = createWorldFixture();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-top-level-setup-"));
    const statePath = join(root, ".vivarium", "state.db");
    const envPath = join(root, "live-readiness.local.env");

    const setup = await dispatchCliCommand([
      "--setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      envPath,
    ]);

    expect(setup.command).toBe("setup");
    expect(setup.result).toMatchObject({
      ok: true,
      local: {
        primaryDomain: "coding",
        statePath,
        starterSkills: [{ title: "Red Green" }],
      },
      quickEnv: {
        ok: true,
        written: true,
        path: envPath,
      },
      dashboardUrl: "http://127.0.0.1:8787",
      nextCommands: expect.arrayContaining([
        expect.stringContaining("local run"),
        "vivarium dashboard",
        "vivarium daemon smoke",
        "vivarium status",
      ]),
    });
    expect(setup.output).toContain("Vivarium Setup");
    expect(setup.output).toContain("Local setup is ready now.");
    expect(setup.output).toContain("Dashboard: http://127.0.0.1:8787");
    expect(setup.output).toContain("vivarium local run");
    expect(setup.output).toContain("vivarium dashboard");
    expect(setup.output).toContain("vivarium daemon smoke");
    expect(setup.output).not.toContain("vivarium setup live");
    expect(setup.output).not.toContain("provider keys");
  });

  test("routes plain installed --setup to the shortest local run command", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-plain-setup-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const env = {
      HOME: home,
      VIVARIUM_DOMAIN: "coding",
      VIVARIUM_WORLD_ROOT: worldRoot,
      VIVARIUM_STATE_PATH: statePath,
      VIVARIUM_LIVE_ENV_PATH: liveEnvPath,
    };

    const setup = await dispatchCliCommand(["--setup"], { env });
    const nextBlock = setup.output.slice(setup.output.indexOf("Next commands:"));

    expect(setup.command).toBe("setup");
    expect(setup.result).toMatchObject({
      dashboardUrl: "http://127.0.0.1:8787",
      nextCommands: expect.arrayContaining([
        "vivarium local run",
        "vivarium dashboard",
        "vivarium daemon smoke",
        "vivarium status",
      ]),
    });
    expect(nextBlock).toContain("\n      vivarium local run\n");
    expect(nextBlock).toContain("vivarium dashboard");
    expect(nextBlock).toContain("vivarium daemon smoke");
    expect(nextBlock).not.toContain("--domain");
    expect(nextBlock).not.toContain("--state-path");
    expect(nextBlock).not.toContain("--world-root");
    expect(nextBlock).not.toContain("--live-env-path");
  });

  test("routes installed env defaults through local setup and default run", async () => {
    const worldRoot = mkdtempSync(join(tmpdir(), "cli-dispatch-install-env-world-"));
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-install-env-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    write(join(worldRoot, "domains", "coding", "curriculum.md"), "# Coding Curriculum\n");
    write(
      join(worldRoot, "domains", "coding", "skills", "installer-env", "SKILL.md"),
      "# Coding Installer Env Skill\n\nUse the installer-provided world root to build a simple agent end to end.",
    );

    const env = {
      HOME: home,
      VIVARIUM_DOMAIN: "coding",
      VIVARIUM_WORLD_ROOT: worldRoot,
      VIVARIUM_STATE_PATH: statePath,
      VIVARIUM_LIVE_ENV_PATH: liveEnvPath,
    };

    const setup = await dispatchCliCommand(["local"], { env });
    const run = await dispatchCliCommand(["local", "run"], { env });

    expect(setup.result).toMatchObject({
      local: {
        statePath,
        worldRoot,
        starterSkills: [{ title: "Coding Installer Env Skill" }],
      },
      liveEnvFilePath: liveEnvPath,
    });
    expect(run.result).toMatchObject({
      memoryPath: statePath,
      transparency: {
        consulted: {
          skills: [expect.stringContaining("installer-env/SKILL.md")],
        },
      },
    });
  });

  test("routes installed env domain defaults through local run", async () => {
    const worldRoot = mkdtempSync(join(tmpdir(), "cli-dispatch-install-env-domain-world-"));
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-install-env-domain-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    write(join(worldRoot, "domains", "research", "curriculum.md"), "# Research Curriculum\n");
    write(
      join(worldRoot, "domains", "research", "skills", "installer-domain", "SKILL.md"),
      "# Research Installer Domain Skill\n\nUse the installer-selected research domain to build a simple agent end to end.",
    );

    const env = {
      HOME: home,
      VIVARIUM_DOMAIN: "research",
      VIVARIUM_WORLD_ROOT: worldRoot,
      VIVARIUM_STATE_PATH: statePath,
      VIVARIUM_LIVE_ENV_PATH: liveEnvPath,
    };

    const setup = await dispatchCliCommand(["local"], { env });
    const run = await dispatchCliCommand(["local", "run"], { env });

    expect(setup.result).toMatchObject({
      local: {
        primaryDomain: "research",
        starterSkills: [{ title: "Research Installer Domain Skill" }],
      },
    });
    expect(run.result).toMatchObject({
      transparency: {
        consulted: {
          skills: [expect.stringContaining("installer-domain/SKILL.md")],
        },
      },
    });
  });

  test("routes quick setup through local init and live env bootstrap", async () => {
    const worldRoot = createWorldFixture();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-quick-"));
    const statePath = join(root, ".vivarium", "state.db");
    const envPath = join(root, "live-readiness.local.env");

    const setup = await dispatchCliCommand([
      "setup",
      "--quick",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      envPath,
      "--github-owner",
      "idanmann10",
      "--agent-repo",
      "vivarium-agent",
      "--world-repo",
      "vivarium-world",
      "--canonical-world-ref",
      "https://github.com/idanmann10/vivarium-world.git",
      "--private-world-ref",
      "git@github.com:idanmann10/vivarium-world-private.git",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(setup.command).toBe("setup");
    expect(setup.result).toMatchObject({
      ok: true,
      local: { statePath },
      quickEnv: {
        ok: true,
        written: true,
        path: envPath,
        mode: "0600",
        prefilled: [
          "VIVARIUM_GITHUB_OWNER",
          "VIVARIUM_AGENT_REPO_NAME",
          "VIVARIUM_WORLD_REPO_NAME",
          "VIVARIUM_CANONICAL_WORLD_REF",
          "VIVARIUM_PRIVATE_WORLD_REF",
        ],
      },
      nextCommands: expect.arrayContaining([
        expect.stringContaining("local run"),
        "vivarium launch handoff",
        "vivarium status",
        "vivarium tools",
        "vivarium help",
        "vivarium update",
      ]),
    });
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
    expect(body).toContain("export VIVARIUM_GITHUB_OWNER='idanmann10'");
    expect(body).toContain("export VIVARIUM_AGENT_REPO_NAME='vivarium-agent'");
    expect(body).toContain("export VIVARIUM_WORLD_REPO_NAME='vivarium-world'");
    expect(body).toContain(
      "export VIVARIUM_CANONICAL_WORLD_REF='https://github.com/idanmann10/vivarium-world.git'",
    );
    expect(body).toContain(
      "export VIVARIUM_PRIVATE_WORLD_REF='git@github.com:idanmann10/vivarium-world-private.git'",
    );
    expect(setup.output).toContain("Local setup is ready now.");
    expect(setup.output).toContain("Live readiness: staged for later");
    expect(setup.output).toContain(`Readiness file: ${envPath}`);
    expect(setup.output).toContain(`--live-env-path ${envPath}`);
    expect(setup.output).not.toContain("Production evidence file prepared for later");
    expect(setup.output).toContain("vivarium launch handoff");
    expect(setup.output).toContain("vivarium status");
    expect(setup.output).toContain("vivarium tools");
    expect(setup.output).toContain("vivarium help");
    expect(setup.output).toContain("vivarium update");
    expect(setup.output).not.toContain(`vivarium setup --env-file ${envPath}`);
    expect(setup.output).not.toContain(`vivarium model --env-file ${envPath}`);
    expect(setup.output).not.toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(setup.output).not.toContain("live env-init");

    const repeated = await dispatchCliCommand([
      "setup",
      "--quick",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      envPath,
    ]);

    expect(repeated.result).toMatchObject({
      ok: true,
      quickEnv: {
        ok: false,
        written: false,
        path: envPath,
        error: "Live readiness env already exists. Pass --overwrite to replace it.",
      },
      nextCommands: expect.arrayContaining([
        expect.stringContaining(`--live-env-path ${envPath}`),
        "vivarium launch handoff",
        "vivarium status",
        "vivarium tools",
        "vivarium help",
        "vivarium update",
      ]),
    });
    expect(repeated.output).toContain("Local setup is ready now.");
    expect(repeated.output).toContain("Live readiness: already staged");
    expect(repeated.output).toContain(`Readiness file: ${envPath}`);
    expect(repeated.output).toContain(`--live-env-path ${envPath}`);
    expect(repeated.output).not.toContain("Production evidence file prepared for later");
    expect(repeated.output).toContain("vivarium launch handoff");
    expect(repeated.output).not.toContain(`vivarium setup --env-file ${envPath}`);
    expect(repeated.output).not.toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(repeated.output).not.toContain("live env-init");
  });

  test("routes onboard as a one-word quick setup alias", async () => {
    const worldRoot = createWorldFixture();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-onboard-"));
    const statePath = join(root, ".vivarium", "state.db");
    const envPath = join(root, "live-readiness.local.env");

    const onboard = await dispatchCliCommand([
      "onboard",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      envPath,
    ]);

    const state = new SQLiteStateRepository(statePath);
    const localSkills = state.listLocalSkills().filter((skill) => skill.domain === "coding");
    state.close();

    expect(onboard.command).toBe("onboard");
    const onboardResult = onboard.result as SetupCommandResult;
    expect(onboardResult).toMatchObject({
      ok: true,
      local: {
        primaryDomain: "coding",
        statePath,
        starterSkills: [{ title: "Red Green" }],
      },
      quickEnv: {
        ok: true,
        written: true,
        path: envPath,
      },
    });
    expect(onboardResult.nextCommands).toEqual([
      `vivarium local run --domain coding --state-path ${statePath} --world-root ${worldRoot} --live-env-path ${envPath}`,
      "vivarium launch handoff",
      "vivarium status",
      "vivarium tools",
      "vivarium help",
      "vivarium update",
    ]);
    expect(localSkills).toEqual([expect.objectContaining({ name: "Red Green", domain: "coding" })]);
    expect(onboard.output).toContain("Vivarium Setup");
    expect(onboard.output).toContain("Local setup is ready now.");
    expect(onboard.output).toContain("Live readiness: staged for later");
    expect(onboard.output).toContain(`Readiness file: ${envPath}`);
    expect(onboard.output).toContain(
      `vivarium local run --domain coding --state-path ${statePath} --world-root ${worldRoot} --live-env-path ${envPath}`,
    );
    expect(onboard.output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(onboard.output).not.toContain("build a tiny local agent");
    expect(onboard.output).not.toContain(`vivarium run --goal "validate local setup" --domain coding --state-path ${statePath}`);
    expect(onboard.output).not.toContain(`vivarium setup --env-file ${envPath}`);
  });

  test("routes onboard live through the default private live setup", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-onboard-live-"));
    const home = join(root, "home");
    const expectedEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const expectedSecretsDir = join(home, ".vivarium", "secrets");
    const expectedSetupDir = join(home, ".vivarium", "live");

    const result = await dispatchCliCommand(["onboard", "live"], { env: { HOME: home } });
    const rerun = await dispatchCliCommand(["onboard", "live"], { env: { HOME: home } });
    const connect = await dispatchCliCommand(["connect"], { env: { HOME: home } });
    const fill = await dispatchCliCommand(["connect", "fill"], { env: { HOME: home } });

    expect(result.command).toBe("onboard");
    expect(result.result).toMatchObject({
      envFilePath: expectedEnvPath,
      setupFileStatus: "created",
      secretFiles: { directory: expectedSecretsDir },
    });
    expect(existsSync(expectedEnvPath)).toBe(true);
    expect(existsSync(join(expectedSecretsDir, "anthropic.key"))).toBe(true);
    expect(readFileSync(join(expectedSecretsDir, "anthropic.key"), "utf8")).toBe("");
    expect(result.output).toContain("Vivarium Live Onboarding");
    expect(result.output).not.toContain("Vivarium Connect Wizard");
    expect(result.output).toContain(`Setup file: ${expectedEnvPath}`);
    expect(result.output).toContain("Local setup checklist:");
    expect(result.output).toContain("[needs] Names and worlds: 4 files");
    expect(result.output).toContain("[needs] GitHub/public release: 4 files");
    expect(result.output).toContain("[needs] Provider accounts: 6 files");
    expect(result.output).toContain("[needs] Internal credential: 3 files");
    expect(result.output).toContain("Names and worlds:");
    expect(result.output).toContain("GitHub/public release:");
    expect(result.output).toContain("Provider accounts:");
    expect(result.output).toContain("Internal credential:");
    expect(result.output).toContain(`Anthropic API key: ${join(expectedSecretsDir, "anthropic.key")}`);
    expect(result.output).toContain("Default local files prepared:");
    expect(result.output).toContain("Provider profiles: profile file path");
    expect(result.output).not.toContain("Filled setup values:");
    expect(result.output).toContain("Paste each value into its file, then rerun vivarium setup live.");
    expect(result.output).toContain("vivarium setup live");
    expect(result.output).not.toContain("vivarium onboard live");
    expect(result.output).toContain("vivarium connect");
    expect(result.output).toContain(
      [
        "  [1] Open account and key handoff",
        "      vivarium connect signup",
        "  [2] Paste local values and rerun setup",
        "      vivarium setup live",
        "  [3] Review live readiness",
        "      vivarium connect",
      ].join("\n"),
    );
    expect(result.output).not.toContain("[1] Prepare live readiness");
    expect(result.output).not.toContain("Paste secrets");
    expect(result.output).not.toContain("vivarium connect wizard --path");
    expect(result.output).not.toContain(`--setup-dir ${expectedSetupDir}`);
    expect(result.output).not.toContain(`vivarium connect setup --env-file ${expectedEnvPath} --confirm-write`);
    expect(result.output).not.toContain("Vivarium Setup");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");
    expect(result.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(rerun.output).toContain("Local setup files waiting for values:");
    expect(rerun.output).toContain("Paste each value into its file, then rerun vivarium setup live.");
    expect(rerun.output).not.toContain("vivarium onboard live");
    expect(rerun.output).not.toContain("Secret files found:");
    expect(connect.output).toContain(`Setup file: ${expectedEnvPath}`);
    expect(connect.output).toContain("vivarium connect fill");
    expect(connect.output).not.toContain(`vivarium connect --env-file ${expectedEnvPath}`);
    expect(fill.output).toContain(`Setup file: ${expectedEnvPath}`);
    expect(fill.output).toContain("Reason: No setup values supplied.");
    expect(fill.output).not.toContain(`vivarium connect fill --env-file ${expectedEnvPath}`);
    expect(readFileSync(expectedEnvPath, "utf8")).toContain(
      `export VIVARIUM_PROVIDER_PROFILES_PATH="${join(expectedSetupDir, "provider-profiles.json")}"`,
    );
    expect(readFileSync(expectedEnvPath, "utf8")).toContain(
      `export VIVARIUM_V1_EVIDENCE_PATH="${join(expectedSetupDir, "v1-evidence.json")}"`,
    );
  });

  test("routes setup live through the same default private live setup", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-"));
    const home = join(root, "home");
    const expectedEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const expectedSecretsDir = join(home, ".vivarium", "secrets");

    const result = await dispatchCliCommand(["setup", "live"], { env: { HOME: home } });

    expect(result.command).toBe("setup");
    expect(result.result).toMatchObject({
      envFilePath: expectedEnvPath,
      setupFileStatus: "created",
      secretFiles: { directory: expectedSecretsDir },
    });
    expect(result.output).toContain("Vivarium Live Onboarding");
    expect(result.output).toContain(`Setup file: ${expectedEnvPath}`);
    expect(result.output).toContain("Local setup checklist:");
    expect(result.output).toContain("[needs] Names and worlds: 4 files");
    expect(result.output).toContain("[needs] GitHub/public release: 4 files");
    expect(result.output).toContain("[needs] Provider accounts: 6 files");
    expect(result.output).toContain("[needs] Internal credential: 3 files");
    expect(result.output).toContain(`Anthropic API key: ${join(expectedSecretsDir, "anthropic.key")}`);
    expect(result.output).toContain("Paste each value into its file, then rerun vivarium setup live.");
    expect(result.output).toContain(
      [
        "  [1] Open account and key handoff",
        "      vivarium connect signup",
        "  [2] Paste local values and rerun setup",
        "      vivarium setup live",
        "  [3] Review live readiness",
        "      vivarium connect",
      ].join("\n"),
    );
    expect(result.output).not.toContain("[1] Prepare live readiness");
    expect(result.output).not.toContain("Paste secrets");
    expect(result.output).not.toContain("[1] Initialize local memory");
    expect(result.output).toContain("vivarium setup live");
    expect(result.output).toContain("vivarium connect");
    expect(result.output).not.toContain("vivarium connect wizard --path");
    expect(result.output).not.toContain("ANTHROPIC_API_KEY");

    for (const file of [
      "agent-repo-name.txt",
      "world-repo-name.txt",
      "canonical-world-ref.txt",
      "private-world-ref.txt",
      "github-token.key",
      "github-owner.txt",
      "github-repository-id.txt",
      "github-discussion-category-id.txt",
      "private-base-url.txt",
      "private-model.txt",
      "private-context-window.txt",
      "internal-health-url.txt",
    ]) {
      expect(existsSync(join(expectedSecretsDir, file))).toBe(true);
      expect(readFileSync(join(expectedSecretsDir, file), "utf8")).toBe("");
    }

    write(join(expectedSecretsDir, "agent-repo-name.txt"), "vivarium-agent\n");
    write(join(expectedSecretsDir, "world-repo-name.txt"), "vivarium-world\n");
    write(join(expectedSecretsDir, "canonical-world-ref.txt"), "git@github.com:owner/vivarium-world.git\n");
    write(join(expectedSecretsDir, "private-world-ref.txt"), "git@github.com:owner/vivarium-world-private.git\n");
    write(join(expectedSecretsDir, "github-token.key"), "ghp_live_token\n");
    write(join(expectedSecretsDir, "github-owner.txt"), "owner\n");
    write(join(expectedSecretsDir, "github-repository-id.txt"), "R_live_world\n");
    write(join(expectedSecretsDir, "github-discussion-category-id.txt"), "DIC_live_rfc\n");
    write(join(expectedSecretsDir, "private-base-url.txt"), "https://private.example/v1\n");
    write(join(expectedSecretsDir, "private-model.txt"), "private-model\n");
    write(join(expectedSecretsDir, "private-context-window.txt"), "128000\n");
    write(join(expectedSecretsDir, "internal-health-url.txt"), "https://internal.example/health\n");

    const filled = await dispatchCliCommand(["setup", "live"], { env: { HOME: home } });
    const envBody = readFileSync(expectedEnvPath, "utf8");

    expect(filled.output).toContain("Filled setup values:");
    expect(filled.output).toContain("Repository metadata: agent repo name, world repo name");
    expect(filled.output).toContain("World subscriptions: canonical world ref, private world ref");
    expect(filled.output).toContain("GitHub/public release: token, owner, repository ID, Discussion category ID");
    expect(filled.output).toContain("Private OpenAI-compatible: base URL, model, context window");
    expect(filled.output).toContain("Internal credential: credential store path, credential name, health URL");
    expect(filled.output).not.toContain("ghp_live_token");
    expect(envBody).toContain('export VIVARIUM_AGENT_REPO_NAME="vivarium-agent"');
    expect(envBody).toContain('export VIVARIUM_WORLD_REPO_NAME="vivarium-world"');
    expect(envBody).toContain('export VIVARIUM_CANONICAL_WORLD_REF="git@github.com:owner/vivarium-world.git"');
    expect(envBody).toContain('export VIVARIUM_PRIVATE_WORLD_REF="git@github.com:owner/vivarium-world-private.git"');
    expect(envBody).toContain('export GITHUB_TOKEN="ghp_live_token"');
    expect(envBody).toContain('export VIVARIUM_GITHUB_OWNER="owner"');
    expect(envBody).toContain('export VIVARIUM_GITHUB_REPOSITORY_ID="R_live_world"');
    expect(envBody).toContain('export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID="DIC_live_rfc"');
    expect(envBody).toContain('export VIVARIUM_OAI_COMPAT_BASE_URL="https://private.example/v1"');
    expect(envBody).toContain('export VIVARIUM_OAI_COMPAT_MODEL="private-model"');
    expect(envBody).toContain('export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW="128000"');
    expect(envBody).toContain('export VIVARIUM_INTERNAL_API_HEALTH_URL="https://internal.example/health"');
  });

  test("routes setup live without asking for source files already configured in the setup file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-env-ready-"));
    const home = join(root, "home");
    const envPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const secretsDir = join(home, ".vivarium", "secrets");
    write(
      envPath,
      [
        'export VIVARIUM_AGENT_REPO_NAME="vivarium-agent"',
        'export VIVARIUM_WORLD_REPO_NAME="vivarium-world"',
        'export VIVARIUM_CANONICAL_WORLD_REF="https://github.com/owner/vivarium-world.git"',
        'export VIVARIUM_PRIVATE_WORLD_REF="git@github.com:owner/vivarium-world-private.git"',
        'export GITHUB_TOKEN="ghp_live_token"',
        'export VIVARIUM_GITHUB_OWNER="owner"',
        'export VIVARIUM_GITHUB_REPOSITORY_ID="R_live_world"',
        'export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID="DIC_live_rfc"',
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["setup", "live"], { env: { HOME: home } });

    expect(result.output).toContain("Vivarium Live Onboarding");
    expect(result.output).toContain(`Setup file: ${envPath}`);
    expect(result.output).not.toContain("[needs] Names and worlds");
    expect(result.output).not.toContain("[needs] GitHub/public release");
    expect(result.output).not.toContain(`Agent repo name: ${join(secretsDir, "agent-repo-name.txt")}`);
    expect(result.output).not.toContain(`GitHub token: ${join(secretsDir, "github-token.key")}`);
    expect(result.output).toContain("[needs] Provider accounts: 6 files");
    expect(result.output).toContain("[needs] Internal credential: 3 files");
  });

  test("keeps custom setup live paths in the local rerun command", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-custom-"));
    const home = join(root, "home");
    const setupDir = join(root, "custom-live");
    const secretsDir = join(root, "custom-secrets");
    const expectedEnvPath = join(setupDir, "live-readiness.local.env");
    const expectedRerunCommand = `vivarium setup live --setup-dir ${setupDir} --secrets-dir ${secretsDir}`;

    const result = await dispatchCliCommand(
      ["setup", "live", "--setup-dir", setupDir, "--secrets-dir", secretsDir],
      { env: { HOME: home } },
    );

    expect(result.command).toBe("setup");
    expect(result.result).toMatchObject({
      envFilePath: expectedEnvPath,
      setupFileStatus: "created",
      secretFiles: { directory: secretsDir },
    });
    expect(result.output).toContain(`Setup file: ${expectedEnvPath}`);
    expect(result.output).toContain("Local setup checklist:");
    expect(result.output).toContain(
      `Paste each value into its file, then rerun ${expectedRerunCommand}.`,
    );
    expect(result.output).toContain(
      [
        "  [1] Open account and key handoff",
        "      vivarium connect signup",
        "  [2] Paste local values and rerun setup",
        `      ${expectedRerunCommand}`,
        "  [3] Review live readiness",
        `      vivarium connect --env-file ${expectedEnvPath}`,
      ].join("\n"),
    );
    expect(result.output).not.toContain("\n      vivarium setup live\n");
  });

  test("routes local setup and local run as the shortest local path", async () => {
    const worldRoot = createWorldFixture();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-local-"));
    const statePath = join(root, ".vivarium", "state.db");
    const envPath = join(root, "live-readiness.local.env");

    const setup = await dispatchCliCommand([
      "local",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      envPath,
    ]);

    const state = new SQLiteStateRepository(statePath);
    const localSkills = state.listLocalSkills().filter((skill) => skill.domain === "coding");
    state.close();

    expect(setup.command).toBe("local");
    expect(setup.result).toMatchObject({
      ok: true,
      local: {
        primaryDomain: "coding",
        statePath,
        starterSkills: [{ title: "Red Green" }],
      },
      quickEnv: {
        ok: true,
        written: true,
        path: envPath,
      },
      nextCommands: expect.arrayContaining([
        `vivarium local run --domain coding --state-path ${statePath} --world-root ${worldRoot} --live-env-path ${envPath}`,
        "vivarium launch handoff",
        "vivarium status",
        "vivarium tools",
        "vivarium help",
        "vivarium update",
      ]),
    });
    expect(localSkills).toEqual([expect.objectContaining({ name: "Red Green", domain: "coding" })]);
    expect(setup.output).toContain("Vivarium Setup");
    expect(setup.output).toContain("Local setup is ready now.");
    expect(setup.output).toContain(
      `vivarium local run --domain coding --state-path ${statePath} --world-root ${worldRoot} --live-env-path ${envPath}`,
    );
    expect(setup.output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(setup.output).not.toContain(`vivarium run --goal "validate local setup" --domain coding --state-path ${statePath}`);

    const run = await dispatchCliCommand([
      "local",
      "run",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);

    expect(run.command).toBe("local");
    expect(run.result).toMatchObject({ success: true, provider: { kind: "local" } });
    expect(run.output).toContain("Vivarium Run");
    expect(run.output).toContain("Status: success");
    expect(run.output).toContain("Provider: local");
  });

  test("routes local setup live bootstrap to the default private live file", async () => {
    const worldRoot = createWorldFixture();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-local-private-live-"));
    const home = join(root, "home");
    const cwd = join(root, "cwd");
    const statePath = join(home, ".vivarium", "state.db");
    const expectedEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");
    const previousCwd = process.cwd();

    mkdirSync(cwd, { recursive: true });

    try {
      process.chdir(cwd);
      const setup = await dispatchCliCommand(
        [
          "local",
          "--domain",
          "coding",
          "--world-root",
          worldRoot,
          "--state-path",
          statePath,
          "--github-owner",
          "idanmann10",
          "--agent-repo",
          "vivarium-agent",
          "--world-repo",
          "vivarium-world",
        ],
        { env: { HOME: home } },
      );

      expect(setup.result).toMatchObject({
        ok: true,
        local: { statePath },
        quickEnv: {
          ok: true,
          written: true,
          path: expectedEnvPath,
        },
      });
      expect(existsSync(expectedEnvPath)).toBe(true);
      expect(existsSync(join(cwd, "live-readiness.local.env"))).toBe(false);
      expect(setup.output).toContain(`Readiness file: ${expectedEnvPath}`);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes pathless local run through the default Vivarium state", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-local-default-home-"));
    const envPath = join(home, "live-readiness.local.env");
    const previousHome = process.env.HOME;
    process.env.HOME = home;

    try {
      const setup = await dispatchCliCommand([
        "local",
        "--world-root",
        worldRoot,
        "--live-env-path",
        envPath,
      ]);
      const statePath = join(home, ".vivarium", "state.db");

      expect(setup.result).toMatchObject({
        local: { agentName: "local-agent", statePath },
      });

      const run = await dispatchCliCommand([
        "local",
        "run",
        "--world-root",
        worldRoot,
      ]);

      const state = new SQLiteStateRepository(statePath);
      const runs = state.listRuns();
      state.close();

      expect(run.result).toMatchObject({ success: true, agentName: "local-agent" });
      expect(runs).toHaveLength(1);
      expect(runs[0]?.goal).toBe("build a simple agent end to end");
      expect(String(runs[0]?.id)).toBe((run.result as { readonly runId: string }).runId);
      expect(run.output).toContain("Agent: local-agent");
      expect(run.output).not.toContain("build a tiny local agent");
      expect(run.output).toContain("Recorded: vivarium status will show Run ID");
      expect(run.output).not.toContain("vivarium status --state-path");
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  test("routes custom local run status receipts through explicit local paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-local-run-custom-status-"));
    const worldRoot = createWorldFixture();
    const statePath = join(root, "state.db");
    const liveEnvPath = join(root, "live-readiness.local.env");

    const run = await dispatchCliCommand([
      "local",
      "run",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--live-env-path",
      liveEnvPath,
    ]);

    expect(run.result).toMatchObject({ success: true, agentName: "local-agent" });
    expect(run.output).toContain(`Memory: ${statePath}`);
    expect(run.output).toContain(
      `Recorded: vivarium status --state-path ${statePath} --live-env-path ${liveEnvPath} will show Run ID`,
    );
    expect(run.output).toContain(
      `vivarium status --state-path ${statePath} --live-env-path ${liveEnvPath}`,
    );
  });

  test("bootstraps default local memory when local run is the first command", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-local-run-first-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");

    const run = await dispatchCliCommand(["local", "run", "--world-root", worldRoot], {
      env: { HOME: home },
    });
    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: home } });
    const status = await dispatchCliCommand(["status"], { env: { HOME: home } });

    const state = new SQLiteStateRepository(statePath);
    const localSkills = state.listLocalSkills().filter((skill) => skill.domain === "coding");
    const runs = state.listRuns();
    const identity = state.getIdentity();
    state.close();

    expect(run.command).toBe("local");
    expect(run.result).toMatchObject({ success: true, agentName: "local-agent" });
    expect(run.output).toContain(`Memory: ${statePath}`);
    expect(identity).toMatchObject({
      name: "local-agent",
      devStages: { coding: "newborn" },
    });
    expect(localSkills).toEqual([expect.objectContaining({ name: "Red Green", domain: "coding" })]);
    expect(runs).toHaveLength(1);
    expect(doctor.result).toMatchObject({
      ok: true,
      checks: expect.arrayContaining(["state:configured"]),
    });
    expect(doctor.output).toContain("Readiness: ready");
    expect(existsSync(liveEnvPath)).toBe(true);
    expect(status.output).toContain(`[staged] Live setup file: ${liveEnvPath}`);
  });

  test("routes corrupt default local run state to repair guidance", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-local-run-corrupt-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    write(statePath, "not a sqlite database");

    try {
      await dispatchCliCommand(["local", "run", "--world-root", worldRoot], {
        env: { HOME: home },
      });
      throw new Error("expected command to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toContain("Local state is invalid");
      expect((error as CliUsageError).message).toContain(statePath);
      expect((error as CliUsageError).nextCommands).toEqual([
        "vivarium doctor",
        "vivarium local",
        "vivarium help",
      ]);
    }
  });

  test("routes corrupt default local setup state to repair guidance", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-local-corrupt-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    write(statePath, "not a sqlite database");

    try {
      await dispatchCliCommand(["local"], { env: { HOME: home } });
      throw new Error("expected command to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toContain("Local state is invalid");
      expect((error as CliUsageError).message).toContain(statePath);
      expect((error as CliUsageError).nextCommands).toEqual([
        "vivarium doctor",
        "vivarium local",
        "vivarium help",
      ]);
    }
  });

  test("routes local run through configured provider flags", async () => {
    const worldRoot = createWorldFixture();
    const run = await dispatchCliCommand([
      "local",
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

    expect(run.command).toBe("local");
    expect(run.result).toEqual({
      success: false,
      agentName: "local-agent",
      runId: null,
      provider: { kind: "openai", id: "run-openai", model: "gpt-test" },
      episodeKinds: [],
      transparency: {
        plan: null,
        outcome: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(run.output).toContain("Vivarium Run");
    expect(run.output).toContain("Status: blocked");
    expect(run.output).toContain("Reason: Provider credentials are not connected for this run.");
    expect(run.output).not.toContain("VIVARIUM_MISSING_PROVIDER_KEY");
    expect(run.output).toContain("vivarium connect fill");
    expect(run.output).toContain("vivarium local run");
  });

  test("routes proof through a friendly v1 evidence checklist", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-proof-"));
    const envPath = join(root, "live-readiness.local.env");
    const evidencePath = join(root, "v1-evidence.json");
    write(
      evidencePath,
      JSON.stringify({
        starterPack: { skillCount: 0, traceCount: 0, firstRunReferences: [] },
        realGoals: [],
        providerSmokes: { anthropic: "", openRouter: "", privateOaiCompat: "" },
        internalCredentialSmoke: "",
        worldSubscriptions: { canonical: "", privateFork: "" },
        behaviorLoop: {},
        dreamArtifacts: { skillCandidates: [] },
        publicContribution: { positiveSignals: [], externalPullUses: [] },
        publishedArtifacts: {},
        curationStats: {},
        twoWeekImprovement: { competingSkillReferences: [], refinementEvidence: [] },
      }),
    );
    write(envPath, `export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"\n`);

    const proof = await dispatchCliCommand(["proof", "--env-file", envPath]);

    expect(proof.command).toBe("proof");
    expect(proof.output).toContain("Vivarium Proof");
    expect(proof.output).toContain("Checks: 0 passing, 8 blocked");
    expect(proof.output).toContain("[needs] Real coding goals");
    expect(proof.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(proof.output).not.toContain(`vivarium proof init --env-file ${envPath}`);
    expect(proof.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(proof.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(proof.output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(proof.output).not.toContain("providerSmokes");

    const detailed = await dispatchCliCommand(["proof", "--env-file", envPath, "--details"]);
    expect(detailed.output).toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(detailed.output).toContain("providerSmokes");
  });

  test("routes proof init through the setup-file evidence path", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-proof-init-"));
    const envPath = join(root, "live-readiness.local.env");
    const evidencePath = join(root, "v1-evidence.json");
    write(envPath, `export VIVARIUM_V1_EVIDENCE_PATH="${evidencePath}"\n`);

    const created = await dispatchCliCommand(["proof", "init", "--env-file", envPath]);
    const body = readFileSync(evidencePath, "utf8");

    expect(created.command).toBe("proof");
    expect(created.result).toMatchObject({
      ok: true,
      written: true,
      envFilePath: envPath,
      path: evidencePath,
    });
    expect(body).toContain('"realGoals": []');
    expect(created.output).toContain("Vivarium Proof Init");
    expect(created.output).toContain(`Evidence manifest: ${evidencePath}`);
    expect(created.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(created.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(created.output).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    expect(created.output).not.toContain("vivarium live evidence-init");
  });

  test("routes setup through missing local state parent directories", async () => {
    const worldRoot = createWorldFixture();
    const statePath = join(
      mkdtempSync(join(tmpdir(), "cli-dispatch-missing-setup-state-")),
      ".vivarium",
      "state.db",
    );

    const setup = await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);

    expect(setup.command).toBe("setup");
    expect(setup.result).toMatchObject({ ok: true, local: { statePath } });
    expect(existsSync(statePath)).toBe(true);
    expect(setup.output).toContain("Local state initialized");
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
      nextCommands: expect.arrayContaining([
        expect.stringContaining("setup --env-file"),
        expect.stringContaining(`model --env-file ${envPath}`),
        expect.stringContaining(`connect smoke --env-file ${envPath}`),
        expect.stringContaining(`proof --env-file ${envPath}`),
      ]),
    });
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
    expect(setup.output).toContain("Live setup dry run");
    expect(setup.output).toContain("anthropic-live");
    expect(setup.output).toContain("--confirm-write");
    expect(setup.output).toContain("vivarium setup --env-file");
    expect(setup.output).toContain(`vivarium model --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(setup.output).not.toContain("vivarium live evidence-init --path v1-evidence.json");
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
        expect.stringContaining("local run"),
        expect.stringContaining(`model --env-file ${envPath}`),
        expect.stringContaining(`connect smoke --env-file ${envPath}`),
        expect.stringContaining(`proof --env-file ${envPath}`),
        expect.stringContaining("doctor --live"),
      ],
    });
    expect(confirmed.output).toContain("Live setup written");
    expect(confirmed.output).toContain(`vivarium model --env-file ${envPath}`);
    expect(confirmed.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(confirmed.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(confirmed.output).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(confirmed.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(confirmed.output).not.toContain("cp docs/live-readiness.env.example");
  });

  test("keeps custom env files in blocked setup next commands", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-blocked-"));
    const worldRoot = createWorldFixture();
    const statePath = join(root, "state.db");
    const envPath = join(root, "operator-live.env");
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
      live: {
        ok: false,
        written: false,
        missing: ["VIVARIUM_INTERNAL_API_HEALTH_URL"],
      },
      nextCommands: expect.arrayContaining([
        expect.stringContaining(`setup --env-file ${envPath}`),
        expect.stringContaining(`model --env-file ${envPath}`),
        expect.stringContaining(`connect smoke --env-file ${envPath}`),
        expect.stringContaining(`proof --env-file ${envPath}`),
        expect.stringContaining(`doctor --live --env-file ${envPath}`),
      ]),
    });
    expect(setup.output).toContain("Live setup blocked");
    expect(setup.output).toContain(`Fill live settings: edit ${envPath} locally. Keep it out of git.`);
    expect(setup.output).toContain("Production unlock needs provider keys/models");
    expect(setup.output).toContain(`vivarium setup --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium model --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(setup.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(setup.output).not.toContain("live env-init --path live-readiness.local.env");
    expect(setup.output).not.toContain("setup --env-file live-readiness.local.env");
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
  });

  test("groups blocked setup placeholders by unlock area", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-setup-live-placeholders-"));
    const worldRoot = createWorldFixture();
    const statePath = join(root, "state.db");
    const envPath = join(root, "operator-live.env");
    write(
      envPath,
      [
        'export ANTHROPIC_API_KEY="<anthropic-api-key>"',
        'export VIVARIUM_ANTHROPIC_MODEL="<anthropic-model>"',
        'export VIVARIUM_CREDENTIALS_MASTER_KEY="<credentials-master-key>"',
        'export VIVARIUM_INTERNAL_API_HEALTH_URL="<internal-health-url>"',
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
      live: {
        ok: false,
        written: false,
        placeholders: expect.arrayContaining([
          "ANTHROPIC_API_KEY",
          "VIVARIUM_ANTHROPIC_MODEL",
          "VIVARIUM_CREDENTIALS_MASTER_KEY",
          "VIVARIUM_INTERNAL_API_HEALTH_URL",
        ]),
      },
    });
    expect(setup.output).toContain("Placeholder keys by unlock area:");
    expect(setup.output).toContain("Guide: docs/guides/live-readiness.md#operator-unlock-key-map");
    expect(setup.output).toContain("Unlock key types:");
    expect(setup.output).toContain("  Safe metadata: repo names, GitHub node IDs, model names, base URLs, context windows");
    expect(setup.output).toContain("  Secrets: provider API keys, GitHub token, credential master key, internal API token");
    expect(setup.output).toContain(
      "  Evidence paths: provider profiles, encrypted credential store, v1 evidence manifest",
    );
    expect(setup.output).toContain("  Provider keys/models:");
    expect(setup.output).toContain("    ANTHROPIC_API_KEY");
    expect(setup.output).toContain("    VIVARIUM_ANTHROPIC_MODEL");
    expect(setup.output).toContain("  Encrypted credentials/internal API:");
    expect(setup.output).toContain("    VIVARIUM_CREDENTIALS_MASTER_KEY");
    expect(setup.output).toContain("    VIVARIUM_INTERNAL_API_HEALTH_URL");
    expect(setup.output).not.toContain("Placeholders: ANTHROPIC_API_KEY");
  });

  test("routes status and doctor commands", async () => {
    await expect(dispatchCliCommand(["status"])).resolves.toMatchObject({
      command: "status",
      result: { repo: "vivarium-agent", runtime: "offline-local" },
      output: expect.stringContaining("Vivarium Status"),
    });
    const status = await dispatchCliCommand(["status"]);
    expect(status.output).toContain("VIVARIUM // local memory // world culture");
    expect(status.output).toContain("Repository: vivarium-agent");
    expect(status.output).toContain("vivarium local");
    expect(status.output).toContain("vivarium dashboard");
    expect(status.output).toContain("vivarium daemon smoke");
    expect(status.output).not.toContain("vivarium run --goal <goal>");
    expect(status.output).not.toContain("vivarium launch handoff");
    expect(status.output).not.toContain("vivarium model");

    const customStatus = await dispatchCliCommand([
      "status",
      "--state-path",
      "/tmp/vivarium-state.db",
      "--live-env-path",
      "/tmp/live-readiness.local.env",
    ]);
    expect(customStatus.output).toContain("Local state: /tmp/vivarium-state.db");
    expect(customStatus.output).toContain("Live setup file: /tmp/live-readiness.local.env");

    const statusHome = mkdtempSync(join(tmpdir(), "cli-dispatch-status-home-"));
    const statusWithHome = await dispatchCliCommand(["status"], { env: { HOME: statusHome } });
    expect(statusWithHome.output).toContain(`Local state: ${join(statusHome, ".vivarium", "state.db")}`);
    expect(statusWithHome.output).toContain(
      `Live setup file: ${join(statusHome, ".vivarium", "live", "live-readiness.local.env")}`,
    );
    expect(statusWithHome.output).toContain("vivarium local              Create the local agent.");
    expect(statusWithHome.output).not.toContain("vivarium local --state-path");
    expect(statusWithHome.output).not.toContain("vivarium connect init --path");

    const doctorHome = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-ready-"));
    const doctorWorldRoot = createWorldFixture();
    const doctorStatePath = join(doctorHome, ".vivarium", "state.db");
    await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      doctorWorldRoot,
      "--state-path",
      doctorStatePath,
    ]);
    await expect(dispatchCliCommand(["doctor"], { env: { HOME: doctorHome } })).resolves.toMatchObject({
      command: "doctor",
      result: { ok: true },
      output: expect.stringContaining("Vivarium Doctor"),
    });
    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: doctorHome } });
    expect(doctor.output).toContain("Readiness: ready");
    expect(doctor.output).toContain("[ok] Local state: configured");

    const previousCwd = process.cwd();
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-no-default-env-"));
    try {
      process.chdir(root);
      await expect(
        dispatchCliCommand(["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world"], {
          doctorRunner: deterministicDoctorRunner,
          env: { HOME: root },
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
          env: { HOME: root },
        },
      );
      expect(liveDoctor.output).toContain("Readiness: needs attention");
      expect(liveDoctor.output).toContain("[fix] Agent repository name: missing");
      expect(liveDoctor.output).not.toContain("[fix] agent.name:missing");
      expect(liveDoctor.output).toContain("Re-run with --details");
      expect(liveDoctor.output).not.toContain("Env:");
      expect(liveDoctor.output).not.toContain("VIVARIUM_PROVIDER_PROFILES_PATH");

      const detailedDoctor = await dispatchCliCommand(
        ["doctor", "--live", "--agent-root", "/agent", "--world-root", "/world", "--details"],
        {
          doctorRunner: deterministicDoctorRunner,
          env: { HOME: root },
        },
      );
      expect(detailedDoctor.output).toContain("Env:");
      expect(detailedDoctor.output).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
      expect(detailedDoctor.output).toContain("[fix] agent.name:missing");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes offline doctor through the default persistent state", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-state-"));
    const statePath = join(home, ".vivarium", "state.db");
    const worldRoot = createWorldFixture();
    await dispatchCliCommand([
      "setup",
      "--domain",
      "coding",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
    ]);

    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: home } });

    expect(doctor.command).toBe("doctor");
    expect(doctor.result).toMatchObject({
      ok: true,
      checks: expect.arrayContaining(["state:configured"]),
    });
    expect(doctor.output).toContain("Readiness: ready");
    expect(doctor.output).toContain("[ok] Local state: configured");
    expect(doctor.output).not.toContain("state:in-memory");
  });

  test("routes unseeded default doctor state to local setup guidance", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-unseeded-state-"));
    const statePath = join(home, ".vivarium", "state.db");
    const state = new SQLiteStateRepository(statePath);
    state.close();

    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: home } });

    expect(doctor.command).toBe("doctor");
    expect(doctor.result).toMatchObject({
      ok: false,
      checks: expect.arrayContaining(["state:uninitialized"]),
    });
    expect(doctor.output).toContain("Readiness: needs attention");
    expect(doctor.output).toContain("Local unlock checklist:");
    expect(doctor.output).toContain("[fix] Local state: needs local setup");
    expect(doctor.output).toContain("seed local-agent identity and starter skills");
    expect(doctor.output).toContain("Command: vivarium local");
    expect(doctor.output).not.toContain("Local state: configured");
  });

  test("routes missing default doctor state to local setup guidance", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-missing-state-"));

    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: home } });

    expect(doctor.command).toBe("doctor");
    expect(doctor.result).toMatchObject({
      ok: false,
      checks: expect.arrayContaining(["state:unavailable"]),
    });
    expect(doctor.output).toContain("Readiness: needs attention");
    expect(doctor.output).toContain("Local unlock checklist:");
    expect(doctor.output).toContain("[fix] Local state: not created yet");
    expect(doctor.output).toContain("Command: vivarium local");
    expect(doctor.output).not.toContain("Live unlock checklist:");
  });

  test("routes corrupt default doctor state to repair guidance", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-doctor-corrupt-state-"));
    const statePath = join(home, ".vivarium", "state.db");
    write(statePath, "not a sqlite database");

    const doctor = await dispatchCliCommand(["doctor"], { env: { HOME: home } });

    expect(doctor.command).toBe("doctor");
    expect(doctor.result).toMatchObject({
      ok: false,
      checks: expect.arrayContaining(["state:invalid"]),
    });
    expect(doctor.output).toContain("Readiness: needs attention");
    expect(doctor.output).toContain("[fix] Local state: invalid");
    expect(doctor.output).toContain("Move the invalid local SQLite state aside, then run vivarium local");
    expect(doctor.output).not.toContain("Local state: configured");
  });

  test("routes explicit main launch handoff with the stable Mac install walkthrough", async () => {
    const result = await dispatchCliCommand(["launch", "handoff", "--ref", "main"]);

    expect(result.command).toBe("launch");
    expect(result.output).toContain("Vivarium Launch Handoff");
    expect(result.output).toContain(
      "https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh",
    );
    expect(result.output).not.toContain("VIVARIUM_AGENT_REF=");
    expect(result.output).toContain("bash -s -- --daemon launchd");
    expect(result.output).not.toContain("VIVARIUM_DAEMON=launchd");
    expect(result.output).toContain("vivarium daemon smoke");
    expect(result.output).not.toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
    expect(result.output).toContain("When ready for live verification:");
    expect(result.output).toContain("vivarium local run");
    expect(result.output).not.toContain('vivarium local run --goal "build a simple agent end to end"');
    expect(
      result.output.slice(
        result.output.indexOf("After install:"),
        result.output.indexOf("When ready for live verification:"),
      ),
    ).not.toContain("--live-env-path");
    expect(
      result.output.slice(
        result.output.indexOf("After install:"),
        result.output.indexOf("When ready for live verification:"),
      ),
    ).not.toContain("--state-path");
    expect(
      result.output.slice(
        result.output.indexOf("After install:"),
        result.output.indexOf("When ready for live verification:"),
      ),
    ).not.toContain("--world-root");
    expect(result.output).toContain("real provider keys/smokes");
  });

  test("routes custom daemon launch handoff details", async () => {
    const result = await dispatchCliCommand([
      "launch",
      "handoff",
      "--ref",
      "main",
      "--daemon-host",
      "127.0.0.1",
      "--daemon-port",
      "9898",
    ]);

    expect(result.command).toBe("launch");
    expect(result.output).toContain("--daemon-port 9898");
    expect(result.output).not.toContain("VIVARIUM_DAEMON_PORT=9898");
    expect(result.output).toContain("vivarium daemon smoke --status-url http://127.0.0.1:9898/status");
    expect(result.output).not.toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
  });

  test("rejects invalid launch handoff daemon ports", async () => {
    try {
      await dispatchCliCommand(["launch", "handoff", "--daemon-port", "not-a-port"]);
      throw new Error("expected launch handoff to reject invalid daemon port");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toBe(
        "--daemon-port must be an integer from 1 to 65535",
      );
    }
  });

  test("rejects invalid launch handoff daemon hosts", async () => {
    try {
      await dispatchCliCommand(["launch", "handoff", "--daemon-host", "bad host"]);
      throw new Error("expected launch handoff to reject invalid daemon host");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toBe(
        "--daemon-host must be a hostname or IPv4 address without a scheme, path, port, or spaces",
      );
    }
  });

  test("routes launch handoff through a branch-pinned install when running from a pre-main checkout", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-launch-branch-"));
    const previousCwd = process.cwd();
    runGit(["init", root]);
    runGit(["config", "user.email", "test@example.test"], root);
    runGit(["config", "user.name", "Test User"], root);
    write(join(root, "README.md"), "# Branch handoff\n");
    runGit(["add", "."], root);
    runGit(["commit", "-m", "seed branch"], root);
    runGit(["checkout", "-b", "codex/local-agent-production-ready"], root);
    const commit = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    }).stdout.toString().trim();

    try {
      process.chdir(root);
      const result = await dispatchCliCommand(["launch", "handoff"]);

      expect(result.command).toBe("launch");
      expect(result.output).toContain(
        `https://raw.githubusercontent.com/idanmann10/vivarium-agent/${commit}/scripts/install.sh`,
      );
      expect(result.output).toContain("--ref codex/local-agent-production-ready --daemon launchd");
      expect(result.output).not.toContain("VIVARIUM_AGENT_REF=");
      expect(result.output).toContain("Run the branch-pinned install command above");
      expect(result.output).not.toContain("Run the stable main install command above");
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes launch handoff through the current PR number when GitHub can resolve it", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-launch-pr-"));
    const bin = join(root, "bin");
    const previousCwd = process.cwd();
    const previousPath = process.env.PATH;
    runGit(["init", root]);
    runGit(["config", "user.email", "test@example.test"], root);
    runGit(["config", "user.name", "Test User"], root);
    write(join(root, "README.md"), "# Branch handoff\n");
    runGit(["add", "."], root);
    runGit(["commit", "-m", "seed branch"], root);
    runGit(["checkout", "-b", "codex/local-agent-production-ready"], root);
    write(
      join(bin, "gh"),
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"pr\" ] && [ \"$2\" = \"view\" ]; then",
        "  printf '26\\n'",
        "  exit 0",
        "fi",
        "printf 'unexpected gh command\\n' >&2",
        "exit 1",
        "",
      ].join("\n"),
    );
    chmodSync(join(bin, "gh"), 0o755);

    try {
      process.chdir(root);
      process.env.PATH = `${bin}:${previousPath ?? ""}`;
      const result = await dispatchCliCommand(["launch", "handoff"]);

      expect(result.command).toBe("launch");
      expect(result.output).toContain(
        "gh pr edit 26 --repo idanmann10/vivarium-agent --add-reviewer REVIEWER_GITHUB_USERNAME",
      );
      expect(result.output).toContain(
        "gh pr view 26 --repo idanmann10/vivarium-agent --json reviewDecision,mergeStateStatus,reviewRequests",
      );
      expect(result.output).not.toContain("gh pr edit PR_NUMBER");
    } finally {
      process.chdir(previousCwd);
      process.env.PATH = previousPath;
    }
  });

  test("routes launch handoff reviewer flags into exact unblock commands", async () => {
    const result = await dispatchCliCommand([
      "launch",
      "handoff",
      "--ref",
      "codex/local-agent-production-ready",
      "--script-ref",
      "51dc4bd4dfa8de02ac2fe8a947ceb9d4066baa2a",
      "--pr-number",
      "26",
      "--reviewer",
      "startclaw-ai",
    ]);

    expect(result.command).toBe("launch");
    expect(result.output).toContain(
      "gh api -X PUT repos/idanmann10/vivarium-agent/collaborators/startclaw-ai -f permission=push",
    );
    expect(result.output).toContain(
      "gh pr view 26 --repo idanmann10/vivarium-agent --json reviewDecision,mergeStateStatus,reviewRequests",
    );
    expect(result.output).toContain(
      "gh pr edit 26 --repo idanmann10/vivarium-agent --add-reviewer startclaw-ai",
    );
    expect(result.output).not.toContain("PR_NUMBER");
    expect(result.output).not.toContain("REVIEWER_GITHUB_USERNAME");
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

  test("routes default init state through the supplied home", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-init-home-"));
    const statePath = join(home, ".vivarium", "state.db");

    const init = await dispatchCliCommand(["init", "--domain", "coding", "--world-root", worldRoot], {
      env: { HOME: home },
    });

    expect(init.result).toMatchObject({ statePath });
    expect(init.output).toContain(`State: ${statePath}`);
  });

  test("routes corrupt default init state to repair guidance", async () => {
    const worldRoot = createWorldFixture();
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-init-corrupt-home-"));
    const statePath = join(home, ".vivarium", "state.db");
    write(statePath, "not a sqlite database");

    try {
      await dispatchCliCommand(["init", "--domain", "coding", "--world-root", worldRoot], {
        env: { HOME: home },
      });
      throw new Error("expected command to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toContain("Local state is invalid");
      expect((error as CliUsageError).message).toContain(statePath);
      expect((error as CliUsageError).nextCommands).toEqual([
        "vivarium doctor",
        "vivarium local",
        "vivarium help",
      ]);
    }
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

  test("routes run world subscriptions through a live env file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-run-env-subscriptions-"));
    const publicWorld = join(root, "public");
    const privateWorld = join(root, "private");
    const subscriptionsPath = join(root, "subscriptions.json");
    const envPath = join(root, "live-readiness.local.env");
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
    write(envPath, `export VIVARIUM_WORLD_SUBSCRIPTIONS_PATH="${subscriptionsPath}"\n`);

    const run = await dispatchCliCommand([
      "run",
      "--goal",
      "use a coding pattern",
      "--domain",
      "coding",
      "--state-path",
      statePath,
      "--env-file",
      envPath,
    ]);
    const state = new SQLiteStateRepository(statePath);
    const storedRun = state.listRuns()[0];
    const plan =
      storedRun === undefined
        ? undefined
        : state.listEpisodes(storedRun.id).find((episode) => episode.kind === "plan");

    expect(run.result).toMatchObject({ success: true });
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
      agentName: "local-agent",
      runId: null,
      provider: { kind: "openai", id: "run-openai", model: "gpt-test" },
      episodeKinds: [],
      transparency: {
        plan: null,
        outcome: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(run.output).toContain("Vivarium Run");
    expect(run.output).toContain("Status: blocked");
    expect(run.output).toContain("Reason: Provider credentials are not connected for this run.");
    expect(run.output).not.toContain("VIVARIUM_MISSING_PROVIDER_KEY");
    expect(run.output).toContain("vivarium connect fill");
    expect(run.output).toContain("vivarium local run");
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
      agentName: "local-agent",
      runId: null,
      provider: { kind: "openai-compat", id: "run-openrouter", model: "openrouter/test-model" },
      episodeKinds: [],
      transparency: {
        plan: null,
        outcome: null,
        prediction: null,
        validation: null,
        consulted: { skills: [], traces: [] },
        highSurprises: [],
      },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
  });

  test("routes local provider-profile runs through a live env file", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-run-env-profile-"));
    const envPath = join(root, "live-readiness.local.env");
    const profilesPath = join(root, "provider-profiles.json");
    const statePath = join(root, "state.db");
    const worldRoot = createWorldFixture();
    await dispatchCliCommand([
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
    write(envPath, `export VIVARIUM_PROVIDER_PROFILES_PATH="${profilesPath}"\n`);

    const run = await dispatchCliCommand([
      "local",
      "run",
      "--goal",
      "write a provider-backed test",
      "--world-root",
      worldRoot,
      "--state-path",
      statePath,
      "--env-file",
      envPath,
      "--provider-profile",
      "openrouter",
    ]);

    expect(run.result).toMatchObject({
      success: false,
      provider: { kind: "openai-compat", id: "run-openrouter", model: "openrouter/test-model" },
      error: "Missing provider environment variable: VIVARIUM_MISSING_PROVIDER_KEY",
    });
    expect(run.output).toContain("Reason: Provider credentials are not connected for this run.");
    expect(run.output).not.toContain("Missing --provider-profiles-path");
    expect(run.output).not.toContain("VIVARIUM_MISSING_PROVIDER_KEY");
  });

  test("routes live setup through a filled env file with explicit write confirmation", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-"));
    const envPath = join(root, "operator-live.env");
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
    expect(result.output).toContain(`vivarium model --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium connect smoke --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium proof --env-file ${envPath}`);
    expect(result.output).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(result.output).not.toContain("vivarium model --env-file live-readiness.local.env");
    expect(result.output).not.toContain("vivarium doctor --live --env-file live-readiness.local.env");
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
    expect(dryRun.output).toContain("[1] Confirm live writes");
    expect(dryRun.output).toContain(`vivarium connect setup --env-file ${envPath} --confirm-write`);
    expect(dryRun.output).not.toContain(`vivarium live setup --env-file ${envPath} --confirm-write`);
    expect(dryRun.output).not.toContain("anthropic-secret");
    expect(dryRun.output.trim().startsWith("{")).toBe(false);
    expect(existsSync(profilesPath)).toBe(false);
    expect(existsSync(credentialsPath)).toBe(false);
  });

  test("reports missing internal API health URL during live setup preflight", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-setup-health-"));
    const envPath = join(root, "operator-missing-health.env");
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

    const result = await dispatchCliCommand(["live", "setup", "--env-file", envPath]);

    expect(result).toMatchObject({
      command: "live",
      result: {
        ok: false,
        written: false,
        missing: ["VIVARIUM_INTERNAL_API_HEALTH_URL"],
      },
    });
    expect(result.output).toContain(`Fill ${envPath}, then run vivarium connect --env-file ${envPath}.`);
    expect(result.output).not.toContain("re-run live setup");
    expect(result.output).toContain("[1] Fill live settings");
    expect(result.output).not.toContain("Fill live-readiness.local.env");
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
    expect(created.output).toContain("[1] Fill evidence manifest");
    expect(created.output).toContain("[2] Prepare live evidence");
    expect(created.output).toContain("[3] Run the readiness gate");
    expect(created.output).toContain("vivarium proof");
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
      prefilled: [],
    });
    expect(createdOutput).toContain("Vivarium Live Env");
    expect(createdOutput).toContain("Status: written");
    expect(createdOutput).toContain(envPath);
    expect(createdOutput).toContain("Permissions: 0600");
    expect(createdOutput).toContain("Next commands");
    expect(createdOutput).toContain("[1] Fill live settings");
    expect(createdOutput).toContain("[2] Prepare live readiness");
    expect(createdOutput).toContain("[3] Run live smoke tests");
    expect(createdOutput).toContain("[4] Prepare live evidence");
    expect(createdOutput).toContain("[5] Run the readiness gate");
    expect(createdOutput).toContain(`vivarium connect --env-file ${envPath}`);
    expect(createdOutput).toContain(`vivarium connect setup --env-file ${envPath}`);
    expect(createdOutput).toContain(`vivarium proof --env-file ${envPath}`);
    expect(createdOutput).toContain(`vivarium doctor --live --env-file ${envPath}`);
    expect(createdOutput).not.toContain(`vivarium setup --env-file ${envPath}`);
    expect(createdOutput).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(createdOutput.trim().startsWith("{")).toBe(false);
    expect(body).toContain("VIVARIUM_PROVIDER_PROFILES_PATH");
    expect(body).toContain('export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"');
    expect(body).toContain('export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_MODEL="openrouter/auto"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="2000000"');
    expect(body).not.toContain('export VIVARIUM_OPENROUTER_BASE_URL="<openrouter-base-url>"');
    expect(body).toContain("vivarium connect smoke");
    expect(body).toContain("vivarium proof");
    expect(body).not.toContain("source live-readiness.local.env");
    expect(body).not.toContain("vivarium providers smoke");
    expect(body).not.toContain("vivarium credentials smoke");
    expect(body).toContain("vivarium connect init");
    expect(body).toContain("vivarium doctor --live");
    expect(body).not.toContain("bun apps/cli/src/main.ts");
    expect(mode).toBe(0o600);
    expect(refused.result).toEqual({
      ok: false,
      written: false,
      path: envPath,
      error: "Live readiness env already exists. Pass --overwrite to replace it.",
    });
    expect(overwritten.result).toMatchObject({ ok: true, written: true, path: envPath });
  });

  test("routes live env init with public repo prefill flags", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-live-env-init-prefill-"));
    const envPath = join(root, "live-readiness.local.env");

    const created = await dispatchCliCommand([
      "live",
      "env-init",
      "--path",
      envPath,
      "--github-owner",
      "idanmann10",
      "--agent-repo",
      "vivarium-agent",
      "--world-repo",
      "vivarium-world",
      "--canonical-world-ref",
      "https://github.com/idanmann10/vivarium-world.git",
      "--private-world-ref",
      "git@github.com:idanmann10/vivarium-world-private.git",
    ]);
    const body = readFileSync(envPath, "utf8");

    expect(created.result).toMatchObject({
      ok: true,
      written: true,
      path: envPath,
      prefilled: [
        "VIVARIUM_GITHUB_OWNER",
        "VIVARIUM_AGENT_REPO_NAME",
        "VIVARIUM_WORLD_REPO_NAME",
        "VIVARIUM_CANONICAL_WORLD_REF",
        "VIVARIUM_PRIVATE_WORLD_REF",
      ],
    });
    expect(body).toContain("export VIVARIUM_GITHUB_OWNER='idanmann10'");
    expect(body).toContain("export VIVARIUM_AGENT_REPO_NAME='vivarium-agent'");
    expect(body).toContain("export VIVARIUM_WORLD_REPO_NAME='vivarium-world'");
    expect(body).toContain(
      "export VIVARIUM_CANONICAL_WORLD_REF='https://github.com/idanmann10/vivarium-world.git'",
    );
    expect(body).toContain(
      "export VIVARIUM_PRIVATE_WORLD_REF='git@github.com:idanmann10/vivarium-world-private.git'",
    );
    expect(body).toContain('export GITHUB_TOKEN="<redacted-github-token>"');
    expect(created.output).toContain("Prefilled:");
    expect(created.output).toContain("VIVARIUM_GITHUB_OWNER");
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

  test("routes GitHub smoke through default live setup values", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-github-defaults-"));
    write(
      join(home, ".vivarium", "live", "live-readiness.local.env"),
      [
        'export VIVARIUM_GITHUB_OWNER="owner"',
        'export VIVARIUM_WORLD_REPO_NAME="world"',
        'export VIVARIUM_GITHUB_REPOSITORY_ID="R_1"',
        'export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID="C_1"',
        "",
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["github", "smoke"], { env: { HOME: home } });

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        owner: "owner",
        repo: "world",
        error: "Missing GitHub token environment variable: GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("owner/world");
  });

  test("routes GitHub discussion through default live setup values", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-github-discussion-defaults-"));
    write(
      join(home, ".vivarium", "live", "live-readiness.local.env"),
      [
        'export VIVARIUM_GITHUB_OWNER="owner"',
        'export VIVARIUM_WORLD_REPO_NAME="world"',
        'export VIVARIUM_GITHUB_REPOSITORY_ID="R_1"',
        'export VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID="C_1"',
        "",
      ].join("\n"),
    );

    const result = await dispatchCliCommand(
      ["github", "discussion", "--confirm-write", "--body", "Bootstrap discussion"],
      { env: { HOME: home } },
    );

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        owner: "owner",
        repo: "world",
        error: "Missing GitHub token environment variable: GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Discussion");
    expect(result.output).toContain("owner/world");
    expect(result.output).not.toContain("Bootstrap discussion");
  });

  test("routes GitHub workflow runs through default live setup values", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-github-workflows-defaults-"));
    write(
      join(home, ".vivarium", "live", "live-readiness.local.env"),
      [
        'export VIVARIUM_GITHUB_OWNER="owner"',
        'export VIVARIUM_WORLD_REPO_NAME="world"',
        "",
      ].join("\n"),
    );

    const result = await dispatchCliCommand(["github", "workflow-runs", "--branch", "main"], {
      env: { HOME: home },
    });

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        owner: "owner",
        repo: "world",
        error: "Missing GitHub token environment variable: GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("Vivarium GitHub Workflows");
    expect(result.output).toContain("owner/world");
  });

  test("routes GitHub workflow runs for the agent target through default live setup values", async () => {
    const home = mkdtempSync(join(tmpdir(), "cli-dispatch-github-agent-workflows-defaults-"));
    write(
      join(home, ".vivarium", "live", "live-readiness.local.env"),
      [
        'export VIVARIUM_GITHUB_OWNER="owner"',
        'export VIVARIUM_AGENT_REPO_NAME="agent"',
        'export VIVARIUM_WORLD_REPO_NAME="world"',
        "",
      ].join("\n"),
    );

    const result = await dispatchCliCommand(
      ["github", "workflow-runs", "--target", "agent", "--branch", "main"],
      { env: { HOME: home } },
    );

    expect(result).toMatchObject({
      command: "github",
      result: {
        ok: false,
        owner: "owner",
        repo: "agent",
        error: "Missing GitHub token environment variable: GITHUB_TOKEN",
      },
    });
    expect(result.output).toContain("owner/agent");
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

  test("routes missing default connect smoke setup to guided live setup", async () => {
    const root = mkdtempSync(join(tmpdir(), "cli-dispatch-connect-smoke-missing-"));
    const previousCwd = process.cwd();

    try {
      process.chdir(root);
      await dispatchCliCommand(["connect", "smoke"], { env: { HOME: join(root, "home") } });
      throw new Error("expected command to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).message).toBe("Missing env file: live-readiness.local.env");
      expect((error as CliUsageError).nextCommands).toEqual([
        "vivarium setup live",
        "vivarium connect",
        "vivarium connect smoke",
        "vivarium help",
      ]);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("routes lower-level provider and credential setup usage errors to connect", async () => {
    for (const argv of [["providers", "list"], ["credentials", "smoke"]] as const) {
      try {
        await dispatchCliCommand(argv);
        throw new Error("expected command to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(CliUsageError);
        expect((error as CliUsageError).nextCommands).toContain(
          "vivarium connect signup",
        );
        expect((error as CliUsageError).nextCommands).toContain(
          "vivarium connect fill",
        );
        expect((error as CliUsageError).nextCommands).toContain(
          "vivarium connect setup --confirm-write",
        );
      }
    }

    try {
      await dispatchCliCommand(["credentials", "smoke"]);
      throw new Error("expected command to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as CliUsageError).nextCommands).toContain(
        "vivarium connect smoke",
      );
    }
  });
});
