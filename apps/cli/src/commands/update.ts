import { renderVivariumGlobe } from "./branding.js";

export interface UpdateCommandRunOptions {
  readonly cwd?: string;
}

export interface UpdateCommandRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type UpdateCommandRunner = (
  command: string,
  args: readonly string[],
  options?: UpdateCommandRunOptions,
) => UpdateCommandRunResult;

export interface UpdateCommandOptions {
  readonly agentRoot?: string;
  readonly runner?: UpdateCommandRunner;
}

export interface UpdateCommandStep {
  readonly name: "git pull" | "bun install";
  readonly ok: boolean;
  readonly command: string;
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

export interface UpdateCommandResult {
  readonly ok: boolean;
  readonly agentRoot: string;
  readonly steps: readonly UpdateCommandStep[];
  readonly error?: string;
}

function defaultRunner(
  command: string,
  args: readonly string[],
  options: UpdateCommandRunOptions = {},
): UpdateCommandRunResult {
  const result = Bun.spawnSync([command, ...args], {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function failedStep(
  name: UpdateCommandStep["name"],
  command: string,
  result: UpdateCommandRunResult,
): UpdateCommandStep {
  return {
    name,
    ok: false,
    command,
    exitCode: result.exitCode,
    ...(result.stdout.length === 0 ? {} : { stdout: result.stdout.trim() }),
    ...(result.stderr.length === 0 ? {} : { stderr: result.stderr.trim() }),
  };
}

export function updateCommand(options: UpdateCommandOptions = {}): UpdateCommandResult {
  const agentRoot = options.agentRoot ?? process.cwd();
  const runner = options.runner ?? defaultRunner;

  const gitArgs = ["-C", agentRoot, "pull", "--ff-only"] as const;
  const gitCommand = `git ${gitArgs.join(" ")}`;
  const gitResult = runner("git", gitArgs);
  if (gitResult.exitCode !== 0) {
    return {
      ok: false,
      agentRoot,
      steps: [failedStep("git pull", gitCommand, gitResult)],
      error: "git pull failed",
    };
  }

  const installArgs = ["install", "--frozen-lockfile"] as const;
  const installCommand = `bun ${installArgs.join(" ")}`;
  const installResult = runner("bun", installArgs, { cwd: agentRoot });
  if (installResult.exitCode !== 0) {
    return {
      ok: false,
      agentRoot,
      steps: [
        { name: "git pull", ok: true, command: gitCommand },
        failedStep("bun install", installCommand, installResult),
      ],
      error: "bun install failed",
    };
  }

  return {
    ok: true,
    agentRoot,
    steps: [
      { name: "git pull", ok: true, command: gitCommand },
      { name: "bun install", ok: true, command: installCommand },
    ],
  };
}

function renderUpdateStep(step: UpdateCommandStep): readonly string[] {
  const prefix = step.ok ? "[ok]" : "[fix]";
  return [
    `  ${prefix} ${step.name}`,
    `       Command: ${step.command}`,
    ...(step.exitCode === undefined ? [] : [`       Exit code: ${step.exitCode}`]),
    ...(step.stdout === undefined ? [] : [`       Stdout: ${step.stdout}`]),
    ...(step.stderr === undefined ? [] : [`       Stderr: ${step.stderr}`]),
  ];
}

export function renderUpdateCommandResult(result: UpdateCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Update",
    "---------------",
    `Status: ${result.ok ? "updated" : "failed"}`,
    `Agent root: ${result.agentRoot}`,
    ...(result.error === undefined ? [] : [`Error: ${result.error}`]),
    "",
    "Steps:",
    ...result.steps.flatMap(renderUpdateStep),
    "",
  ].join("\n");
}
