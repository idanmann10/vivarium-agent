import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const gitCommitEnv = {
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_AUTHOR_NAME: "Vivarium Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Vivarium Test",
} as const;

function run(command: string[], cwd: string, env: Readonly<Record<string, string>> = {}) {
  const result = Bun.spawnSync(command, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      [
        `Command failed: ${command.join(" ")}`,
        `stdout:\n${result.stdout.toString()}`,
        `stderr:\n${result.stderr.toString()}`,
      ].join("\n"),
    );
  }
  return result;
}

function createGitRemote(root: string, name: string): string {
  const remote = join(root, `${name}.git`);
  const work = join(root, `${name}-work`);

  run(["git", "init", "--bare", remote], root);
  run(["git", "init", work], root);
  run(["git", "config", "user.email", "test@example.com"], work);
  run(["git", "config", "user.name", "Vivarium Test"], work);
  writeFileSync(join(work, "README.md"), `# ${name}\n`, "utf8");
  run(["git", "add", "README.md"], work);
  run(["git", "commit", "-m", "initial"], work, gitCommitEnv);
  run(["git", "branch", "-M", "main"], work);
  run(["git", "remote", "add", "origin", remote], work);
  run(["git", "push", "-u", "origin", "main"], work);

  return remote;
}

function writeFakeBun(path: string): void {
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if [ "${1:-}" = "install" ]; then exit 0; fi',
      'if [ "${1:-}" = "apps/cli/src/main.ts" ] && [ "${2:-}" = "launch" ] && [ "${3:-}" = "handoff" ]; then',
      '  echo "fake launch handoff"',
      "  exit 0",
      "fi",
      'if [ "${1:-}" = "apps/cli/src/main.ts" ]; then exit 0; fi',
      'echo "unexpected fake bun args: $*" >&2',
      "exit 1",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o755 },
  );
}

describe("install.sh", () => {
  test("prints a one-line installer dry-run plan with local commands", () => {
    const result = runInstallerDryRun({
      VIVARIUM_BIN_DIR: "/tmp/vivarium-bin",
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_REPO_URL: "https://github.com/example/vivarium-agent.git",
      VIVARIUM_DOMAIN: "research",
      VIVARIUM_LIVE_ENV_PATH: ".vivarium/research-live.env",
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
      `Would run: bun apps/cli/src/main.ts local --domain research --world-root ${worldRoot} --state-path .vivarium/research.db --live-env-path .vivarium/research-live.env`,
    );
    expect(stdout).toContain("After installation:");
    expect(stdout).toContain("[1] Run the local agent");
    expect(stdout).toContain("[2] Review launch handoff");
    expect(stdout).toContain("[3] Keep moving");
    expect(stdout).toContain("Live setup when ready:");
    expect(stdout).toContain("[1] Generate local setup files");
    expect(stdout).toContain("[2] Open account and key handoff");
    expect(stdout).toContain("[3] Review readiness");
    expect(stdout).toContain("[4] Prove live readiness");
    expect(stdout).not.toContain("vivarium run --goal");
    expect(stdout).toContain(
      `vivarium local run --goal "build a tiny local agent" --domain research --state-path .vivarium/research.db --world-root ${worldRoot} --live-env-path .vivarium/research-live.env`,
    );
    expect(stdout).toContain("vivarium setup live");
    expect(stdout).toContain("vivarium connect signup");
    expect(stdout).toContain("vivarium connect setup --confirm-write");
    expect(stdout).toContain("vivarium connect smoke");
    expect(stdout).toContain("vivarium proof init");
    expect(stdout).toContain("\n      vivarium proof\n");
    expect(stdout).toContain("vivarium doctor --live");
    expect(stdout).not.toContain("vivarium live env-init --path live-readiness.local.env");
    expect(stdout).not.toContain("vivarium setup --env-file live-readiness.local.env");
    expect(stdout).not.toContain("vivarium model --env-file live-readiness.local.env");
    expect(stdout).not.toContain("vivarium live evidence-init --path v1-evidence.json");
    expect(stdout).not.toContain("vivarium doctor --live --env-file live-readiness.local.env");
    expect(stdout).toContain("vivarium launch handoff");
    expect(stdout).toContain("vivarium status");
    expect(stdout).toContain("vivarium help");
    expect(stdout).toContain("vivarium update");
    expect(stdout).toContain(
      `/tmp/vivarium-bin/vivarium local run --goal "build a tiny local agent" --domain research --state-path .vivarium/research.db --world-root ${worldRoot} --live-env-path .vivarium/research-live.env`,
    );
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium setup live");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium connect signup");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium connect setup --confirm-write");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium connect smoke");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium proof init");
    expect(stdout).toContain("\n      /tmp/vivarium-bin/vivarium proof\n");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium doctor --live");
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium live env-init --path live-readiness.local.env",
    );
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium setup --env-file live-readiness.local.env",
    );
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium model --env-file live-readiness.local.env",
    );
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium live evidence-init --path v1-evidence.json",
    );
    expect(stdout).not.toContain(
      "/tmp/vivarium-bin/vivarium doctor --live --env-file live-readiness.local.env",
    );
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium launch handoff");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium help");
    expect(stdout).toContain("/tmp/vivarium-bin/vivarium update");
    expect(stdout).toContain("Launch handoff summary:");
    expect(stdout).toContain("Would run: /tmp/vivarium-bin/vivarium launch handoff");
    expect(stdout).toContain("If 'vivarium' is not found, add /tmp/vivarium-bin to PATH");
  });

  test("defaults installer state to the shared Vivarium home", () => {
    const home = mkdtempSync(join(tmpdir(), "vivarium-install-home-"));
    const result = runInstallerDryRun({
      HOME: home,
      VIVARIUM_BIN_DIR: join(home, ".local", "bin"),
      VIVARIUM_INSTALL_DIR: join(home, ".vivarium", "vivarium-agent"),
      VIVARIUM_WORLD_ROOT: join(home, ".vivarium", "the-world"),
    });
    const stdout = result.stdout.toString();
    const statePath = join(home, ".vivarium", "state.db");
    const liveEnvPath = join(home, ".vivarium", "live", "live-readiness.local.env");

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain(`State path: ${statePath}`);
    expect(stdout).toContain(`Live readiness path: ${liveEnvPath}`);
    expect(stdout).toContain(
      `Would run: bun apps/cli/src/main.ts local --domain coding --world-root ${join(home, ".vivarium", "the-world")} --state-path ${statePath} --live-env-path ${liveEnvPath}`,
    );
    expect(stdout).toContain(
      `vivarium local run --goal "build a tiny local agent" --domain coding --state-path ${statePath} --world-root ${join(home, ".vivarium", "the-world")} --live-env-path ${liveEnvPath}`,
    );
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
    expect(stdout).toContain(
      "Would run: /tmp/vivarium-bin/vivarium launch handoff --daemon-port 9898",
    );
  });

  test("uses a custom Bun executable for install and generated commands", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-bun-path-"));
    const remote = createGitRemote(root, "agent");
    const worldRemote = createGitRemote(root, "world");
    const installDir = join(root, "install");
    const worldDir = join(root, "world-checkout");
    const binDir = join(root, "bin");
    const fakeBun = join(root, "custom-bun");

    try {
      writeFakeBun(fakeBun);

      const result = Bun.spawnSync(["bash", "scripts/install.sh"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
          VIVARIUM_BIN_DIR: binDir,
          VIVARIUM_BUN_PATH: fakeBun,
          VIVARIUM_INSTALL_DIR: installDir,
          VIVARIUM_REPO_URL: remote,
          VIVARIUM_WORLD_REPO_URL: worldRemote,
          VIVARIUM_WORLD_ROOT: worldDir,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(binDir, "vivarium"), "utf8")).toContain(
        `exec ${fakeBun} apps/cli/src/main.ts "$@"`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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

  test("returns branch-pinned installs to the default branch when reinstalling without a ref", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-main-"));
    const remote = createGitRemote(root, "agent");
    const worldRemote = createGitRemote(root, "world");
    const installDir = join(root, "install");
    const worldDir = join(root, "world-checkout");
    const binDir = join(root, "bin");
    const fakeBun = join(root, "bun");

    try {
      writeFakeBun(fakeBun);
      run(["git", "clone", remote, installDir], root);
      run(["git", "checkout", "-b", "codex/hermes-style-quick-setup"], installDir);
      run(["git", "config", "branch.codex/hermes-style-quick-setup.remote", "origin"], installDir);
      run(
        [
          "git",
          "config",
          "branch.codex/hermes-style-quick-setup.merge",
          "refs/heads/codex/hermes-style-quick-setup",
        ],
        installDir,
      );

      const result = Bun.spawnSync(["bash", "scripts/install.sh"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH ?? ""}`,
          VIVARIUM_BIN_DIR: binDir,
          VIVARIUM_BUN_PATH: fakeBun,
          VIVARIUM_INSTALL_DIR: installDir,
          VIVARIUM_REPO_URL: remote,
          VIVARIUM_WORLD_REPO_URL: worldRemote,
          VIVARIUM_WORLD_ROOT: worldDir,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).toBe(0);
      expect(run(["git", "branch", "--show-current"], installDir).stdout.toString().trim()).toBe(
        "main",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("pins an existing checkout to origin ref when another remote has the same branch", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-multiremote-"));
    const remote = createGitRemote(root, "agent");
    const worldRemote = createGitRemote(root, "world");
    const branchWork = join(root, "agent-branch-work");
    const installDir = join(root, "install");
    const worldDir = join(root, "world-checkout");
    const binDir = join(root, "bin");
    const fakeBun = join(root, "bun");
    const branchName = "codex/local-agent-production-ready";

    try {
      writeFakeBun(fakeBun);
      run(["git", "clone", remote, branchWork], root);
      run(["git", "checkout", "-b", branchName], branchWork);
      writeFileSync(join(branchWork, "BRANCH.md"), "# branch\n", "utf8");
      run(["git", "add", "BRANCH.md"], branchWork);
      run(["git", "commit", "-m", "branch"], branchWork, gitCommitEnv);
      run(["git", "push", "-u", "origin", branchName], branchWork);

      run(["git", "clone", remote, installDir], root);
      run(["git", "remote", "add", "github", remote], installDir);

      const result = Bun.spawnSync(["bash", "scripts/install.sh"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH ?? ""}`,
          VIVARIUM_AGENT_REF: branchName,
          VIVARIUM_BIN_DIR: binDir,
          VIVARIUM_BUN_PATH: fakeBun,
          VIVARIUM_INSTALL_DIR: installDir,
          VIVARIUM_REPO_URL: remote,
          VIVARIUM_WORLD_REPO_URL: worldRemote,
          VIVARIUM_WORLD_ROOT: worldDir,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).toBe(0);
      expect(run(["git", "branch", "--show-current"], installDir).stdout.toString().trim()).toBe(
        branchName,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("infers safe live metadata from GitHub repository URLs", () => {
    const result = runInstallerDryRun({
      VIVARIUM_INSTALL_DIR: "/tmp/vivarium-agent-install",
      VIVARIUM_REPO_URL: "git@github.com:example/vivarium-agent.git",
      VIVARIUM_WORLD_REPO_URL: "https://github.com/example/vivarium-world.git",
      VIVARIUM_WORLD_ROOT: "/tmp/vivarium-world",
    });
    const stdout = result.stdout.toString();

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("--github-owner example");
    expect(stdout).toContain("--agent-repo vivarium-agent");
    expect(stdout).toContain("--world-repo vivarium-world");
    expect(stdout).toContain("--canonical-world-ref https://github.com/example/vivarium-world.git");
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
    expect(source).toContain('need_command "$bun_command"');
    expect(source).toContain("VIVARIUM_REPO_URL");
    expect(source).toContain("VIVARIUM_INSTALL_DIR");
    expect(source).toContain("VIVARIUM_BIN_DIR");
    expect(source).toContain("VIVARIUM_DAEMON");
    expect(source).toContain("VIVARIUM_THEME");
    expect(source).toContain('exec %q apps/cli/src/main.ts "$@"');
  });

  test("prints a copyable Bun install command when Bun is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-missing-bun-"));
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "git"), ["#!/bin/sh", "exit 0", ""].join("\n"), {
      encoding: "utf8",
      mode: 0o755,
    });

    try {
      const result = Bun.spawnSync(["/bin/bash", "scripts/install.sh"], {
        env: {
          ...process.env,
          HOME: root,
          PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      const stderr = result.stderr.toString();

      expect(result.exitCode).toBe(1);
      expect(stderr).toContain("Missing required command: bun");
      expect(stderr).toContain("curl -fsSL https://bun.sh/install | bash");
      expect(stderr).toContain("Then reload your shell and rerun the Vivarium installer.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("prints a copyable macOS Git install command when Git is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-install-missing-git-"));
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(
      join(bin, "dirname"),
      [
        "#!/bin/sh",
        'path="${1%/}"',
        'case "$path" in */*) dir="${path%/*}"; [ -n "$dir" ] || dir=/; printf "%s\\n" "$dir" ;; *) printf ".\\n" ;; esac',
        "",
      ].join("\n"),
      { encoding: "utf8", mode: 0o755 },
    );
    writeFileSync(
      join(bin, "basename"),
      ["#!/bin/sh", 'path="${1%/}"', 'printf "%s\\n" "${path##*/}"', ""].join("\n"),
      { encoding: "utf8", mode: 0o755 },
    );

    try {
      const result = Bun.spawnSync(["/bin/bash", "scripts/install.sh"], {
        env: {
          ...process.env,
          HOME: root,
          PATH: `${bin}:/bin:/usr/sbin:/sbin`,
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      const stderr = result.stderr.toString();

      expect(result.exitCode).toBe(1);
      expect(stderr).toContain("Missing required command: git");
      expect(stderr).toContain("xcode-select --install");
      expect(stderr).toContain("Then rerun the Vivarium installer.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
