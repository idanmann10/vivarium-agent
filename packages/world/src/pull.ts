import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const pullMode = "read";

export interface GitCommand {
  readonly args: readonly string[];
  readonly cwd?: string;
}

export type GitCommandRunner = (command: GitCommand) => Promise<void> | void;

export interface PullWorldRequest {
  readonly remote: string;
  readonly destination: string;
  readonly ref?: string;
  readonly runner?: GitCommandRunner;
}

export interface PullWorldResult {
  readonly mode: "cloned" | "updated";
  readonly remote: string;
  readonly destination: string;
  readonly ref?: string;
}

function runGitCommand(command: GitCommand): void {
  const result =
    command.cwd === undefined
      ? Bun.spawnSync(["git", ...command.args], { stdout: "pipe", stderr: "pipe" })
      : Bun.spawnSync(["git", ...command.args], { cwd: command.cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    const stderr = (result.stderr?.toString() ?? "").trim();
    throw new Error(stderr.length === 0 ? `git ${command.args.join(" ")} failed` : stderr);
  }
}

export async function pullWorld(request: PullWorldRequest): Promise<PullWorldResult> {
  const runner = request.runner ?? runGitCommand;

  if (!existsSync(request.destination)) {
    mkdirSync(dirname(request.destination), { recursive: true });
    await runner({ args: ["clone", request.remote, request.destination] });
    if (request.ref !== undefined) {
      await runner({ args: ["checkout", request.ref], cwd: request.destination });
    }
    return {
      mode: "cloned",
      remote: request.remote,
      destination: request.destination,
      ...(request.ref === undefined ? {} : { ref: request.ref }),
    };
  }

  if (!existsSync(join(request.destination, ".git"))) {
    throw new Error("World destination exists but is not a git checkout");
  }

  await runner({ args: ["fetch", "--all", "--prune"], cwd: request.destination });
  if (request.ref !== undefined) {
    await runner({ args: ["checkout", request.ref], cwd: request.destination });
  }
  await runner({ args: ["pull", "--ff-only"], cwd: request.destination });

  return {
    mode: "updated",
    remote: request.remote,
    destination: request.destination,
    ...(request.ref === undefined ? {} : { ref: request.ref }),
  };
}
