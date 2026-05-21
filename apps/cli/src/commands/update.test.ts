import { describe, expect, test } from "bun:test";

import { renderUpdateCommandResult, updateCommand, type UpdateCommandRunner } from "./update.js";

describe("updateCommand", () => {
  test("pulls the agent checkout and refreshes dependencies", () => {
    const calls: Array<{ command: string; args: readonly string[]; cwd?: string }> = [];
    const runner: UpdateCommandRunner = (command, args, options = {}) => {
      calls.push({
        command,
        args,
        ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      });
      return { exitCode: 0, stdout: `${command} ok`, stderr: "" };
    };

    const result = updateCommand({ agentRoot: "/tmp/vivarium-agent", runner });
    const bunCommand = process.execPath;

    expect(result).toEqual({
      ok: true,
      agentRoot: "/tmp/vivarium-agent",
      steps: [
        { name: "git pull", ok: true, command: "git -C /tmp/vivarium-agent pull --ff-only" },
        { name: "bun install", ok: true, command: `${bunCommand} install --frozen-lockfile` },
      ],
    });
    expect(calls).toEqual([
      { command: "git", args: ["-C", "/tmp/vivarium-agent", "pull", "--ff-only"] },
      { command: bunCommand, args: ["install", "--frozen-lockfile"], cwd: "/tmp/vivarium-agent" },
    ]);

    const output = renderUpdateCommandResult(result);
    expect(output).toContain("Vivarium Update");
    expect(output).toContain("VIVARIUM // local memory // world culture");
    expect(output).toContain("Status: updated");
    expect(output).toContain("Agent root: /tmp/vivarium-agent");
    expect(output).toContain("[ok] git pull");
    expect(output).toContain("[ok] bun install");
  });

  test("uses a configured Bun executable when refreshing dependencies", () => {
    const calls: Array<{ command: string; args: readonly string[]; cwd?: string }> = [];
    const runner: UpdateCommandRunner = (command, args, options = {}) => {
      calls.push({
        command,
        args,
        ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      });
      return { exitCode: 0, stdout: `${command} ok`, stderr: "" };
    };

    const result = updateCommand({
      agentRoot: "/tmp/vivarium-agent",
      bunCommand: "/opt/vivarium/bin/bun",
      runner,
    });

    expect(result.steps).toContainEqual({
      name: "bun install",
      ok: true,
      command: "/opt/vivarium/bin/bun install --frozen-lockfile",
    });
    expect(calls).toEqual([
      { command: "git", args: ["-C", "/tmp/vivarium-agent", "pull", "--ff-only"] },
      {
        command: "/opt/vivarium/bin/bun",
        args: ["install", "--frozen-lockfile"],
        cwd: "/tmp/vivarium-agent",
      },
    ]);
  });

  test("stops when the git update fails", () => {
    const calls: string[] = [];
    const runner: UpdateCommandRunner = (command) => {
      calls.push(command);
      return { exitCode: 1, stdout: "", stderr: "not a git checkout" };
    };

    const result = updateCommand({ agentRoot: "/tmp/not-agent", runner });

    expect(result).toEqual({
      ok: false,
      agentRoot: "/tmp/not-agent",
      steps: [
        {
          name: "git pull",
          ok: false,
          command: "git -C /tmp/not-agent pull --ff-only",
          exitCode: 1,
          stderr: "not a git checkout",
        },
      ],
      error: "git pull failed",
    });
    expect(calls).toEqual(["git"]);

    const output = renderUpdateCommandResult(result);
    expect(output).toContain("Status: failed");
    expect(output).toContain("[fix] git pull");
    expect(output).toContain("Error: git pull failed");
    expect(output).toContain("not a git checkout");
  });
});
