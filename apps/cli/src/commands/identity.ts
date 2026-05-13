import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface IdentityCommandOptions {
  readonly statePath: string;
}

export interface IdentityStageCommandOptions extends IdentityCommandOptions {
  readonly domain: string;
}

export interface IdentityHistoryCommandOptions extends IdentityCommandOptions {
  readonly limit?: number;
}

export interface IdentitySummaryCommandResult {
  readonly summary: string;
}

export interface IdentityStageCommandResult {
  readonly domain: string;
  readonly stage: string | null;
}

export interface IdentityHistoryItem {
  readonly runId: string;
  readonly domain: string;
  readonly goal: string;
  readonly success: boolean | null;
  readonly score: number | null;
  readonly notes: string;
}

export interface IdentityHistoryCommandResult {
  readonly history: readonly IdentityHistoryItem[];
}

export function identitySummaryCommand(options: IdentityCommandOptions): IdentitySummaryCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return { summary: state.getIdentity()?.summary ?? "No identity summary recorded yet." };
  } finally {
    state.close();
  }
}

export function identityStageCommand(options: IdentityStageCommandOptions): IdentityStageCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return { domain: options.domain, stage: state.getIdentity()?.devStages[options.domain] ?? null };
  } finally {
    state.close();
  }
}

export function identityHistoryCommand(options: IdentityHistoryCommandOptions): IdentityHistoryCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    const runs = state.listRuns();
    const limit = Math.max(0, Math.floor(options.limit ?? 5));
    return {
      history: runs.slice(Math.max(0, runs.length - limit)).map((run) => ({
        runId: String(run.id),
        domain: run.domain,
        goal: run.goal,
        success: run.success,
        score: run.score,
        notes: run.notes,
      })),
    };
  } finally {
    state.close();
  }
}

function successLabel(success: boolean | null): string {
  if (success === true) {
    return "yes";
  }
  if (success === false) {
    return "no";
  }
  return "unknown";
}

export function renderIdentitySummaryCommandResult(result: IdentitySummaryCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Identity",
    "-----------------",
    `Summary: ${result.summary}`,
    "",
  ].join("\n");
}

export function renderIdentityStageCommandResult(result: IdentityStageCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Identity",
    "-----------------",
    `Domain: ${result.domain}`,
    `Stage: ${result.stage ?? "not recorded"}`,
    "",
  ].join("\n");
}

function renderHistoryItem(item: IdentityHistoryItem): readonly string[] {
  return [
    `  ${item.runId}`,
    `    Domain: ${item.domain}`,
    `    Goal: ${item.goal}`,
    `    Success: ${successLabel(item.success)}`,
    `    Score: ${item.score ?? "not scored"}`,
    ...(item.notes.length === 0 ? [] : [`    Notes: ${item.notes}`]),
  ];
}

export function renderIdentityHistoryCommandResult(result: IdentityHistoryCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Identity",
    "-----------------",
    `History: ${result.history.length}`,
    ...(result.history.length === 0 ? [] : ["", ...result.history.flatMap(renderHistoryItem)]),
    "",
  ].join("\n");
}
