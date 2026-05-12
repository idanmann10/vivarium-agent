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
    expect(stdout).toContain("Repository: https://github.com/example/vivarium-agent.git");
    expect(stdout).toContain(
      "Would run: git clone https://github.com/example/vivarium-agent.git /tmp/vivarium-agent-install",
    );
    expect(stdout).toContain("Would run: bun install --frozen-lockfile");
    expect(stdout).toContain(
      `Would run: bun apps/cli/src/main.ts setup --domain research --world-root ${worldRoot} --state-path .vivarium/research.db`,
    );
  });

  test("documents strict shell behavior and dependency checks", () => {
    const source = readFileSync("scripts/install.sh", "utf8");

    expect(source).toContain("set -euo pipefail");
    expect(source).toContain("need_command git");
    expect(source).toContain("need_command bun");
    expect(source).toContain("VIVARIUM_REPO_URL");
    expect(source).toContain("VIVARIUM_INSTALL_DIR");
  });
});
