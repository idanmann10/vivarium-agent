import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Run } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface StatusSummary {
  readonly repo: string;
  readonly runtime: "offline-local";
  readonly localState?: {
    readonly path: string;
    readonly ready: boolean;
    readonly lastRun?: {
      readonly id: string;
      readonly goal: string;
      readonly domain: string;
      readonly success: boolean | null;
      readonly score: number | null;
    };
  };
  readonly liveSetup?: {
    readonly path: string;
    readonly staged: boolean;
  };
}

export interface StatusCommandOptions {
  readonly statePath?: string;
  readonly liveEnvPath?: string;
  readonly pathExists?: (path: string) => boolean;
}

function defaultVivariumHome(): string {
  return process.env.HOME ?? homedir();
}

function latestRun(runs: readonly Run[]): Run | undefined {
  return [...runs].sort((left, right) => {
    const leftTime = left.endedAt ?? left.startedAt;
    const rightTime = right.endedAt ?? right.startedAt;
    return rightTime.localeCompare(leftTime);
  })[0];
}

function inspectLocalState(
  statePath: string,
  pathExists: (path: string) => boolean,
): NonNullable<StatusSummary["localState"]> {
  if (!pathExists(statePath)) {
    return { path: statePath, ready: false };
  }

  let state: SQLiteStateRepository | undefined;
  try {
    state = new SQLiteStateRepository(statePath);
    const identity = state.getIdentity();
    const hasIdentity = identity !== undefined && identity.name.trim().length > 0;
    const hasStarterSkill = state.listLocalSkills().some(
      (skill) =>
        skill.status === "promoted" &&
        skill.domain.trim().length > 0 &&
        skill.body.trim().length > 0,
    );
    const run = latestRun(state.listRuns());
    return {
      path: statePath,
      ready: hasIdentity && hasStarterSkill,
      ...(run === undefined
        ? {}
        : {
            lastRun: {
              id: String(run.id),
              goal: run.goal,
              domain: run.domain,
              success: run.success,
              score: run.score,
            },
          }),
    };
  } catch {
    return { path: statePath, ready: false };
  } finally {
    state?.close();
  }
}

export function statusCommand(options: StatusCommandOptions = {}): StatusSummary {
  const home = defaultVivariumHome();
  const statePath = options.statePath ?? join(home, ".vivarium", "state.db");
  const liveEnvPath =
    options.liveEnvPath ?? join(home, ".vivarium", "live", "live-readiness.local.env");
  const pathExists = options.pathExists ?? existsSync;
  return {
    repo: "vivarium-agent",
    runtime: "offline-local",
    localState: inspectLocalState(statePath, pathExists),
    liveSetup: { path: liveEnvPath, staged: pathExists(liveEnvPath) },
  };
}

function renderLastRun(
  lastRun: NonNullable<NonNullable<StatusSummary["localState"]>["lastRun"]> | undefined,
): readonly string[] {
  if (lastRun === undefined) {
    return [];
  }

  const status = lastRun.success === null ? "running" : lastRun.success ? "success" : "blocked";
  const score = lastRun.score === null ? "" : `, score ${lastRun.score}`;
  return [
    `  [run] Last run: ${lastRun.goal} (${status}${score})`,
    `        Domain: ${lastRun.domain}`,
    `        Run ID: ${lastRun.id}`,
  ];
}

export function renderStatusCommandResult(result: StatusSummary): string {
  const localState = result.localState ?? { path: ".vivarium/state.db", ready: false };
  const liveSetup = result.liveSetup ?? {
    path: "live-readiness.local.env",
    staged: false,
  };
  const localCommand = localState.ready ? "vivarium local run" : "vivarium local";
  const liveCommand = liveSetup.staged ? "vivarium connect" : "vivarium setup live";
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Status",
    "---------------",
    `Repository: ${result.repo}`,
    `Runtime: ${result.runtime}`,
    "",
    "Production readiness",
    `  [${localState.ready ? "ready" : "needs"}] Local state: ${localState.path}`,
    ...renderLastRun(localState.lastRun),
    `  [${liveSetup.staged ? "staged" : "needs"}] Live setup file: ${liveSetup.path}`,
    `  [gate] Live proof: vivarium proof`,
    `  [gate] Readiness check: vivarium doctor --live`,
    "",
    "Next commands:",
    `  ${localCommand.padEnd(28)}${localState.ready ? "Run the local agent." : "Create the local agent."}`,
    `  ${liveCommand.padEnd(28)}${liveSetup.staged ? "Review live setup readiness." : "Start guided live onboarding."}`,
    "  vivarium model               Inspect configured provider profiles.",
    "  vivarium proof               Review the v1 evidence checklist.",
    "  vivarium doctor --live       Run the production readiness gate.",
    "  vivarium launch handoff      Review install and production boundaries.",
    "  vivarium help                Show the command guide.",
    "",
  ].join("\n");
}
