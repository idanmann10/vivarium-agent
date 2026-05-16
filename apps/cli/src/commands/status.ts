import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { renderVivariumGlobe } from "./branding.js";

export interface StatusSummary {
  readonly repo: string;
  readonly runtime: "offline-local";
  readonly localState?: {
    readonly path: string;
    readonly ready: boolean;
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

export function statusCommand(options: StatusCommandOptions = {}): StatusSummary {
  const home = defaultVivariumHome();
  const statePath = options.statePath ?? join(home, ".vivarium", "state.db");
  const liveEnvPath =
    options.liveEnvPath ?? join(home, ".vivarium", "live", "live-readiness.local.env");
  const pathExists = options.pathExists ?? existsSync;
  return {
    repo: "vivarium-agent",
    runtime: "offline-local",
    localState: { path: statePath, ready: pathExists(statePath) },
    liveSetup: { path: liveEnvPath, staged: pathExists(liveEnvPath) },
  };
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
