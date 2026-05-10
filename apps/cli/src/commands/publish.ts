import { runId, type Visibility } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { createSelfTools } from "../../../../packages/tools/src/index.js";
import { createLocalWorldReader } from "../../../../packages/world/src/index.js";

export interface PublishListCommandOptions {
  readonly statePath: string;
}

export interface PublishRunCommandOptions extends PublishListCommandOptions {
  readonly worldRoot: string;
  readonly worldSubscriptionsPath: string;
  readonly runId: string;
  readonly visibility: Visibility;
  readonly contributor: string;
}

export interface PublishTraceCommandOptions extends PublishListCommandOptions {
  readonly worldRoot: string;
  readonly worldSubscriptionsPath: string;
  readonly traceId: string;
  readonly visibility: Visibility;
  readonly contributor: string;
}

export interface PublishListCommandResult {
  readonly publishables: readonly { readonly kind: string; readonly path: string; readonly body: string }[];
}

export function publishListCommand(options: PublishListCommandOptions): PublishListCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return { publishables: state.listPublishableArtifacts() };
  } finally {
    state.close();
  }
}

export function publishRunCommand(options: PublishRunCommandOptions): unknown {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return createSelfTools({
      state,
      world: createLocalWorldReader({ root: options.worldRoot }),
      worldRoot: options.worldRoot,
      worldSubscriptionsPath: options.worldSubscriptionsPath,
    }).world.publishRun({
      runId: runId(options.runId),
      visibility: options.visibility,
      contributor: options.contributor,
    });
  } finally {
    state.close();
  }
}

export function publishTraceCommand(options: PublishTraceCommandOptions): unknown {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return createSelfTools({
      state,
      world: createLocalWorldReader({ root: options.worldRoot }),
      worldRoot: options.worldRoot,
      worldSubscriptionsPath: options.worldSubscriptionsPath,
    }).world.publishTrace({
      traceId: options.traceId,
      visibility: options.visibility,
      contributor: options.contributor,
    });
  } finally {
    state.close();
  }
}
