import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";

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
