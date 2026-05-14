import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function runInstallerDryRun(env: Readonly<Record<string, string>> = {}) {
  return Bun.spawnSync(["bash", "scripts/install.sh", "--dry-run"], {
    env: {
      ...process.env,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("install.sh", () => {
  test("prints a one-line installer dry-run plan with setup command", () => {
    const result = runInstallerDryRun({
      VIVARIUM_BIN_DIR: "/tmp/vivarium-bin",
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_REPO_URL: "https://github.com/example/vivarium-agent.git",
      VIVARIUM_DOMAIN: "research",
      VIVARIUM_WORLD_ROOT: "../research-world",
      VIVARIUM_STATE_PATH: ".vivarium/research.db",
    });
    const stdout = result.stdout.toString();
    const worldRoot = resolve("../research-world");

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Vivarium Agent Installer");
    expect(stdout).toContain("VIVARIUM // local memory // world culture");
    expect(stdout).toContain("Install directory: /tmp/vivarium-agent-install");
    expect(stdout).toContain("Command path: /tmp/vivarium-bin/vivarium");
    expect(stdout).toContain("Repository: https://github.com/example/vivarium-agent.git");
    expect(stdout).toContain(
      "Would run: git clone https://github.com/example/vivarium-agent.git /tmp/vivarium-agent-install",
    );
    expect(stdout).toContain("Would run: bun install --frozen-lockfile");
    expect(stdout).toContain("Would write vivarium command: /tmp/vivarium-bin/vivarium");
    expect(stdout).toContain(
      `Would run: bun apps/cli/src/main.ts setup --quick --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
    expect(stdout).toContain("After installation:");
    expect(stdout).toContain("[1] Prove the local loop");
    expect(stdout).toContain("[2] Prepare live readiness");
    expect(stdout).toContain("[3] Inspect configured models");
    expect(stdout).toContain("[4] Prepare live evidence");
    expect(stdout).toContain("[5] Run the readiness gate");
    expect(stdout).toContain("[6] Keep moving");
    expect(stdout).toContain("vivarium run --goal");
    expect(stdout).toContain(
      'vivarium run --goal "validate local setup" --state-path .vivarium/research.db',
    );
    expect(stdout).toContain("Edit live-readiness.local.env locally. Keep it out of git.");
    expect(stdout).not.toContain("vivarium live env-init --path live-readiness.local.env");
    expect(stdout).toContain(
      `vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
    expect(stdout).toContain(
      `vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db --confirm-write`,
    );
    expect(stdout).toContain("vivarium model --env-file live-readiness.local.env");
    expect(stdout).toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(stdout).toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(stdout).toContain("vivarium status");
    expect(stdout).toContain("vivarium help");
    expect(stdout).toContain("vivarium update");
    expect(stdout).toContain(
      '/tmp/vivarium-bin/vivarium run --goal "validate local setup" --state-path .vivarium/research.db',
    );
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium live env-init --path live-readiness.local.env",
    );
    expect(stdout).toContain(
      `/tmp/vivarium-bin/vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
    expect(stdout).toContain(
      `/tmp/vivarium-bin/vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db --confirm-write`,
    );
    expect(stdout).toContain(
      "/tmp/vivarium-bin/vivarium model --env-file live-readiness.local.env",
    );
    expect(stdout).toContain(
      "/tmp/vivarium-bin/vivarium live evidence-init --path v1-evidence.json",
    );
    expect(stdout).toContain(
      "/tmp/vivarium-bin/vivarium doctor --live --env-file live-readiness.local.env",
    );
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium help");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium update");
    expect(stdout).toContain("If 'vivarium' is not found, add /tmp/vivarium-bin to PATH");
  });

  test("prints a branded ANSI installer when color is forced", () => {
    const forced = runInstallerDryRun({ FORCE_COLOR: "1" }).stdout.toString();
    const matrix = runInstallerDryRun({
      FORCE_COLOR: "1",
      VIVARIUM_THEME: "matrix",
    }).stdout.toString();
    const amber = runInstallerDryRun({
      FORCE_COLOR: "1",
      VIVARIUM_THEME: "amber",
    }).stdout.toString();
    const disabled = runInstallerDryRun({
      FORCE_COLOR: "1",
      VIVARIUM_COLOR: "never",
    }).stdout.toString();

    expect(forced).toContain("\u001b[");
    expect(forced).toContain("\u001b[1;36mVivarium Agent Installer\u001b[0m");
    expect(matrix).toContain("\u001b[32m __      __");
    expect(amber).toContain("\u001b[33m __      __");
    expect(disabled).not.toContain("\u001b[");
  });

  test("can dry-run an opt-in macOS LaunchAgent deployment", () => {
    const result = runInstallerDryRun({
      VIVARIUM_BIN_DIR: "/tmp/vivarium-bin",
      VIVARIUM_DAEMON: "launchd",
      VIVARIUM_DAEMON_LABEL: "com.example.vivarium.daemon",
      VIVARIUM_DAEMON_PORT: "9898",
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_WORLD_ROOT: "/tmp/vivarium-world",
    });
    const stdout = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Daemon deployment: launchd");
    expect(stdout).toContain(
      "Would write macOS LaunchAgent: ~/Library/LaunchAgents/com.example.vivarium.daemon.plist",
    );
    expect(stdout).toContain(
      "Would run: launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.example.vivarium.daemon.plist",
    );
    expect(stdout).toContain(
      "Would run: launchctl kickstart -k gui/$UID/com.example.vivarium.daemon",
    );
    expect(stdout).toContain("vivarium daemon smoke --status-url http://127.0.0.1:9898/status");
    expect(stdout).toContain(
      "/tmp/vivarium-bin/vivarium daemon smoke --status-url http://127.0.0.1:9898/status",
    );
  });

  test("can pin the agent checkout to an explicit git ref", () => {
    const result = runInstallerDryRun({
      VIVARIUM_AGENT_REF: "codex/hermes-style-quick-setup",
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_WORLD_ROOT: "/tmp/vivarium-world",
    });
    const stdout = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("Agent ref: codex/hermes-style-quick-setup");
    expect(stdout).toContain(
      "Would run: git clone https://github.com/idanmann10/vivarium-agent.git /tmp/vivarium-agent-install",
    );
    expect(stdout).toContain("Would run: git -C /tmp/vivarium-agent-install fetch --all --prune");
    expect(stdout).toContain(
      "Would run: git -C /tmp/vivarium-agent-install checkout codex/hermes-style-quick-setup",
    );
  });

  test("normalizes origin remotes for existing checkouts before updating", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-"));
    const agentDir = join(root, "agent");
    const worldDir = join(root, "world");

    mkdirSync(join(agentDir, ".git"), { recursive: true });
    mkdirSync(join(worldDir, ".git"), { recursive: true });

    try {
      const result = runInstallerDryRun({
        VIVARIUM_INSTALL_DIR: agentDir,
        VIVARIUM_REPO_URL: "https://github.com/example/vivarium-agent.git",
        VIVARIUM_WORLD_REPO_URL: "https://github.com/example/vivarium-world.git",
        VIVARIUM_WORLD_ROOT: worldDir,
      });
      const stdout = result.stdout.toString();

      expect(result.exitCode).toBe(0);
      expect(stdout).toContain(
        `Would ensure git origin for ${agentDir}: https://github.com/example/vivarium-agent.git`,
      );
      expect(stdout).toContain(
        `Would ensure git origin for ${worldDir}: https://github.com/example/vivarium-world.git`,
      );
      expect(stdout).toContain(`Would run: git -C ${agentDir} pull --ff-only`);
      expect(stdout).toContain(`Would run: git -C ${worldDir} pull --ff-only`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes safe live metadata into quick setup when configured", () => {
    const result = runInstallerDryRun({
      VIVARIUM_AGENT_REPO_NAME: "vivarium-agent",
      VIVARIUM_CANONICAL_WORLD_REF: "https://github.com/idanmann10/vivarium-world.git",
      VIVARIUM_GITHUB_OWNER: "idanmann10",
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_PRIVATE_WORLD_REF: "https://github.com/idanmann10/vivarium-world-private.git",
      VIVARIUM_WORLD_REPO_NAME: "vivarium-world",
      VIVARIUM_WORLD_ROOT: "/tmp/vivarium-world",
    });
    const stdout = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("--github-owner idanmann10");
    expect(stdout).toContain("--agent-repo vivarium-agent");
    expect(stdout).toContain("--world-repo vivarium-world");
    expect(stdout).toContain(
      "--canonical-world-ref https://github.com/idanmann10/vivarium-world.git",
    );
    expect(stdout).toContain(
      "--private-world-ref https://github.com/idanmann10/vivarium-world-private.git",
    );
  });

  test("documents strict shell behavior and dependency checks", () => {
    const source = readFileSync("scripts/install.sh", "utf8");

    expect(source).toContain("set -euo pipefail");
    expect(source).toContain("need_command git");
    expect(source).toContain("need_command bun");
    expect(source).toContain("VIVARIUM_REPO_URL");
    expect(source).toContain("VIVARIUM_INSTALL_DIR");
    expect(source).toContain("VIVARIUM_BIN_DIR");
    expect(source).toContain("VIVARIUM_DAEMON");
    expect(source).toContain("VIVARIUM_THEME");
    expect(source).toContain('bun apps/cli/src/main.ts "$@"');
  });
});
