import { runId, type Visibility } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { createSelfTools } from "../../../../packages/tools/src/index.js";
import { createLocalWorldReader, type ProposalWorldTarget } from "../../../../packages/world/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

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

export interface PublishArtifactCommandResult {
  readonly target: ProposalWorldTarget;
  readonly path: string;
}

export function publishListCommand(options: PublishListCommandOptions): PublishListCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return { publishables: state.listPublishableArtifacts() };
  } finally {
    state.close();
  }
}

export function publishRunCommand(options: PublishRunCommandOptions): PublishArtifactCommandResult {
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

export function publishTraceCommand(options: PublishTraceCommandOptions): PublishArtifactCommandResult {
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

function renderPublishable(publishable: PublishListCommandResult["publishables"][number]): readonly string[] {
  return [
    `  ${publishable.kind}`,
    `    Path: ${publishable.path}`,
    `    Body bytes: ${publishable.body.length}`,
  ];
}

export function renderPublishListCommandResult(result: PublishListCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Publish",
    "----------------",
    `Publishables: ${result.publishables.length}`,
    ...(result.publishables.length === 0
      ? [
          "",
          "Next command:",
          "  vivarium run --goal <goal> --domain coding",
        ]
      : ["", ...result.publishables.flatMap(renderPublishable)]),
    "",
  ].join("\n");
}

function renderPublishArtifactResult(title: string, result: PublishArtifactCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    title,
    "-".repeat(title.length),
    "Status: published",
    `Target: ${result.target.label}`,
    `Root: ${result.target.root}`,
    `Priority: ${result.target.priority}`,
    `Auto-push: ${result.target.autoPushEnabled === true ? "enabled" : "disabled"}`,
    `Path: ${result.path}`,
    "",
  ].join("\n");
}

export function renderPublishRunCommandResult(result: PublishArtifactCommandResult): string {
  return renderPublishArtifactResult("Vivarium Publish Run", result);
}

export function renderPublishTraceCommandResult(result: PublishArtifactCommandResult): string {
  return renderPublishArtifactResult("Vivarium Publish Trace", result);
}
