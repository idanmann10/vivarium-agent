import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { agentId, skillId } from "../../../../packages/core/src/index.js";
import { migrationVersions, SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import type { LocalSkillRecord } from "../../../../packages/state/src/index.js";
import { createLocalWorldReader, type LocalWorldSearchResult } from "../../../../packages/world/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface InitCommandOptions {
  readonly primaryDomain: string;
  readonly bindGithubIdentity: boolean;
  readonly agentName?: string;
  readonly worldRoot?: string;
  readonly statePath?: string;
  readonly providerProfiles?: readonly string[];
  readonly credentialNames?: readonly string[];
}

export interface StarterArtifact {
  readonly id: string;
  readonly title: string;
  readonly path: string;
}

export interface InitCommandResult {
  readonly agentName: string;
  readonly primaryDomain: string;
  readonly statePath: string;
  readonly worldRoot: string;
  readonly starterSkills: readonly StarterArtifact[];
  readonly starterTraces: readonly StarterArtifact[];
  readonly curriculumPath: string | null;
  readonly migrations: readonly string[];
  readonly prompts: readonly string[];
}

export function describeInitCommand(options: InitCommandOptions): string {
  return `Initialize local state for ${options.primaryDomain}`;
}

function defaultStatePath(): string {
  return join(process.env.HOME ?? homedir(), ".vivarium", "state.db");
}

function artifact(result: LocalWorldSearchResult): StarterArtifact {
  return { id: result.id, title: result.title, path: result.path };
}

function skillRecord(result: LocalWorldSearchResult, domain: string): LocalSkillRecord {
  return {
    id: skillId(result.id),
    name: result.title,
    domain,
    status: "promoted",
    uses: 0,
    helped: 0,
    lastUsedRunOffset: 0,
    habitual: false,
    body: readFileSync(result.path, "utf8"),
  };
}

function initPrompts(options: InitCommandOptions): readonly string[] {
  return [
    ...(options.bindGithubIdentity ? ["Bind GitHub identity"] : []),
    ...(options.providerProfiles ?? []).map((provider) => `Configure provider: ${provider}`),
    ...(options.credentialNames ?? []).map((credential) => `Add credential: ${credential}`),
  ];
}

export function runInitCommand(options: InitCommandOptions): InitCommandResult {
  const agentName = options.agentName ?? "local-agent";
  const worldRoot = options.worldRoot ?? "../the-world";
  const statePath = options.statePath ?? defaultStatePath();
  const world = createLocalWorldReader({ root: worldRoot });
  const results = world.search({ domain: options.primaryDomain, query: options.primaryDomain, limit: 40 });
  const starterSkills = results.filter((result) => result.kind === "skill").slice(0, 30);
  const starterTraces = results.filter((result) => result.kind === "trace").slice(0, 5);
  const curriculumPath = join(worldRoot, "domains", options.primaryDomain, "curriculum.md");
  const state = new SQLiteStateRepository(statePath);

  for (const skill of starterSkills) {
    state.upsertLocalSkill(skillRecord(skill, options.primaryDomain));
  }
  state.advanceCurriculum(options.primaryDomain, 0);
  state.setIdentity({
    agentId: agentId(agentName),
    name: agentName,
    devStages: { [options.primaryDomain]: "newborn" },
    runsCompleted: 0,
    summary: `Newborn local agent initialized for ${options.primaryDomain}.`,
    updatedAt: "local",
  });
  state.close();

  return {
    agentName,
    primaryDomain: options.primaryDomain,
    statePath,
    worldRoot,
    starterSkills: starterSkills.map(artifact),
    starterTraces: starterTraces.map(artifact),
    curriculumPath: existsSync(curriculumPath) ? curriculumPath : null,
    migrations: migrationVersions,
    prompts: initPrompts(options),
  };
}

function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function renderStarterArtifacts(label: string, artifacts: readonly StarterArtifact[]): readonly string[] {
  return [
    `${label}: ${artifacts.length}`,
    ...artifacts.slice(0, 5).map((artifact) => `  ${artifact.title}`),
    ...(artifacts.length > 5 ? [`  ...and ${artifacts.length - 5} more`] : []),
  ];
}

export function renderInitCommandResult(result: InitCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Init",
    "-------------",
    `Agent: ${result.agentName}`,
    `Domain: ${result.primaryDomain}`,
    `State: ${result.statePath}`,
    `Curriculum: ${result.curriculumPath ?? "not found"}`,
    `Migrations: ${result.migrations.length === 0 ? "none" : result.migrations.join(", ")}`,
    ...renderStarterArtifacts("Starter skills", result.starterSkills),
    ...renderStarterArtifacts("Starter traces", result.starterTraces),
    ...(result.prompts.length === 0 ? [] : ["", "Prompts:", ...result.prompts.map((prompt) => `  ${prompt}`)]),
    "",
    "Next command:",
    `  vivarium local run --goal "build a tiny local agent" --domain ${shellQuote(result.primaryDomain)} --state-path ${shellQuote(result.statePath)} --world-root ${shellQuote(result.worldRoot)}`,
    "",
  ].join("\n");
}
