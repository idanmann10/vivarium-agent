import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import type { CurriculumProgress } from "../../../../packages/core/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface CurriculumReadCommandOptions {
  readonly worldRoot: string;
  readonly domain: string;
}

export interface CurriculumStateCommandOptions {
  readonly statePath: string;
  readonly domain: string;
}

export interface CurriculumAdvanceCommandOptions extends CurriculumStateCommandOptions {
  readonly stepIndex: number;
}

export interface CurriculumReadCommandResult {
  readonly domain: string;
  readonly path: string;
  readonly body: string | null;
}

export interface CurriculumProgressCommandResult {
  readonly domain: string;
  readonly progress: CurriculumProgress | null;
}

export function curriculumReadCommand(options: CurriculumReadCommandOptions): CurriculumReadCommandResult {
  const path = join(options.worldRoot, "domains", options.domain, "curriculum.md");
  return {
    domain: options.domain,
    path,
    body: existsSync(path) ? readFileSync(path, "utf8") : null,
  };
}

export function curriculumProgressCommand(options: CurriculumStateCommandOptions): CurriculumProgressCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    return { domain: options.domain, progress: state.getCurriculumProgress(options.domain) ?? null };
  } finally {
    state.close();
  }
}

export function curriculumAdvanceCommand(options: CurriculumAdvanceCommandOptions): CurriculumProgressCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    state.advanceCurriculum(options.domain, options.stepIndex);
    return { domain: options.domain, progress: state.getCurriculumProgress(options.domain) ?? null };
  } finally {
    state.close();
  }
}

export function renderCurriculumReadCommandResult(result: CurriculumReadCommandResult): string {
  const body = result.body?.trimEnd();
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Curriculum",
    "-------------------",
    `Domain: ${result.domain}`,
    `Path: ${result.path}`,
    `Status: ${body === undefined ? "missing" : "found"}`,
    ...(body === undefined ? [] : ["", "Body:", ...body.split(/\r?\n/).map((line) => `  ${line}`)]),
    ...(body === undefined
      ? [
          "",
          "Next command:",
          "  Check the world root and domain, then run vivarium init again.",
        ]
      : []),
    "",
  ].join("\n");
}

export function renderCurriculumProgressCommandResult(result: CurriculumProgressCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Curriculum",
    "-------------------",
    `Domain: ${result.domain}`,
    `Status: ${result.progress === null ? "not started" : "started"}`,
    `Current step: ${result.progress?.currentStepIndex ?? "none"}`,
    `Completed steps: ${result.progress === null ? "none" : result.progress.completedSteps.join(", ")}`,
    ...(result.progress === null ? [] : [`Started at: ${result.progress.startedAt}`]),
    "",
    "Next command:",
    "  vivarium curriculum advance --state-path <state.db> --domain <domain> --step <index>",
    "",
  ].join("\n");
}
