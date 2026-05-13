import { describe, expect, test } from "bun:test";

import { updateCommand, type UpdateCommandRunner } from "./update.js";

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

    expect(result).toEqual({
      ok: true,
      agentRoot: "/tmp/vivarium-agent",
      steps: [
        { name: "git pull", ok: true, command: "git -C /tmp/vivarium-agent pull --ff-only" },
        { name: "bun install", ok: true, command: "bun install --frozen-lockfile" },
      ],
    });
    expect(calls).toEqual([
      { command: "git", args: ["-C", "/tmp/vivarium-agent", "pull", "--ff-only"] },
      { command: "bun", args: ["install", "--frozen-lockfile"], cwd: "/tmp/vivarium-agent" },
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
  });
});
