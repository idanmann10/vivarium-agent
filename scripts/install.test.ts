import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    expect(stdout).toContain('.-""""-.');
    expect(stdout).toContain("Install directory: /tmp/vivarium-agent-install");
    expect(stdout).toContain("Command path: /tmp/vivarium-bin/vivarium");
    expect(stdout).toContain("Repository: https://github.com/example/vivarium-agent.git");
    expect(stdout).toContain(
      "Would run: git clone https://github.com/example/vivarium-agent.git /tmp/vivarium-agent-install",
    );
    expect(stdout).toContain("Would run: bun install --frozen-lockfile");
    expect(stdout).toContain("Would write vivarium command: /tmp/vivarium-bin/vivarium");
    expect(stdout).toContain(
      `Would run: bun apps/cli/src/main.ts setup --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
    expect(stdout).toContain("After installation:");
    expect(stdout).toContain("vivarium run --goal");
    expect(stdout).toContain(
      'vivarium run --goal "validate local setup" --state-path .vivarium/research.db',
    );
    expect(stdout).toContain("vivarium live env-init --path live-readiness.local.env");
    expect(stdout).toContain(
      `vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
    expect(stdout).toContain(
      `vivarium setup --env-file live-readiness.local.env --domain research --world-root ${worldRoot} --state-path .vivarium/research.db --confirm-write`,
    );
    expect(stdout).toContain("vivarium model --env-file live-readiness.local.env");
    expect(stdout).toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(stdout).toContain("vivarium status");
    expect(stdout).toContain("vivarium help");
    expect(stdout).toContain("vivarium update");
    expect(stdout).toContain(
      '/tmp/vivarium-bin/vivarium run --goal "validate local setup" --state-path .vivarium/research.db',
    );
    expect(stdout).toContain(
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
      "/tmp/vivarium-bin/vivarium doctor --live --env-file live-readiness.local.env",
    );
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium help");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium update");
    expect(stdout).toContain("If 'vivarium' is not found, add /tmp/vivarium-bin to PATH");
  });

  test("prints a branded ANSI installer when color is forced", () => {
    const forced = runInstallerDryRun({ FORCE_COLOR: "1" }).stdout.toString();
    const disabled = runInstallerDryRun({
      FORCE_COLOR: "1",
      VIVARIUM_COLOR: "never",
    }).stdout.toString();

    expect(forced).toContain("\u001b[");
    expect(forced).toContain("\u001b[1;36mVivarium Agent Installer\u001b[0m");
    expect(disabled).not.toContain("\u001b[");
  });

  test("documents strict shell behavior and dependency checks", () => {
    const source = readFileSync("scripts/install.sh", "utf8");

    expect(source).toContain("set -euo pipefail");
    expect(source).toContain("need_command git");
    expect(source).toContain("need_command bun");
    expect(source).toContain("VIVARIUM_REPO_URL");
    expect(source).toContain("VIVARIUM_INSTALL_DIR");
    expect(source).toContain("VIVARIUM_BIN_DIR");
    expect(source).toContain('bun apps/cli/src/main.ts "$@"');
  });
});
