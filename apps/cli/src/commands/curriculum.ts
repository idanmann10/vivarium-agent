import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import type { CurriculumProgress } from "../../../../packages/core/src/index.js";

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
