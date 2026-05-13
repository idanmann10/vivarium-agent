import { runDream, type DreamDomainStats, type DreamResult } from "../../../../packages/runtime/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { renderVivariumGlobe } from "./branding.js";

export interface DreamCommandOptions {
  readonly statePath: string;
  readonly domain?: string;
}

function statsForDomain(state: SQLiteStateRepository, domain: string): DreamDomainStats {
  const runs = state.listRuns().filter((run) => run.domain === domain);
  const completed = runs.filter((run) => run.success !== null);
  const successful = runs.filter((run) => run.success === true);
  const skillDiversity = new Set(
    state
      .listLocalSkills()
      .filter((skill) => skill.domain === domain && skill.uses >= 3)
      .map((skill) => String(skill.id)),
  ).size;

  return {
    runsCompleted: completed.length,
    successRate: completed.length === 0 ? 0 : successful.length / completed.length,
    skillDiversity,
  };
}

function commandDomains(state: SQLiteStateRepository, explicitDomain: string | undefined): readonly string[] {
  if (explicitDomain !== undefined) {
    return [explicitDomain];
  }

  const domains = new Set<string>();
  for (const run of state.listRuns()) {
    domains.add(run.domain);
  }
  for (const skill of state.listLocalSkills()) {
    domains.add(skill.domain);
  }

  return domains.size === 0 ? ["coding"] : [...domains].sort();
}

export function dreamCommand(options: DreamCommandOptions): DreamResult {
  const state = new SQLiteStateRepository(options.statePath);
  try {
    const domainStats = Object.fromEntries(
      commandDomains(state, options.domain).map((domain) => [domain, statsForDomain(state, domain)]),
    );
    return runDream({ state, domainStats });
  } finally {
    state.close();
  }
}

function renderCountedItems(label: string, items: readonly string[]): readonly string[] {
  return [
    `${label}: ${items.length}`,
    ...items.slice(0, 5).map((item) => `  ${item}`),
    ...(items.length > 5 ? [`  ...and ${items.length - 5} more`] : []),
  ];
}

export function renderDreamCommandResult(result: DreamResult): string {
  const stages = Object.entries(result.devStages);
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Dream",
    "--------------",
    `Identity: ${result.identitySummary}`,
    ...renderCountedItems("Promoted", result.promoted),
    ...renderCountedItems("Pruned", result.pruned),
    ...renderCountedItems("Habitual", result.habitual),
    ...renderCountedItems("Skill candidates", result.skillCandidates),
    ...renderCountedItems("Anti-pattern candidates", result.antiPatternCandidates),
    ...renderCountedItems("Trace candidates", result.traceCandidates),
    ...(stages.length === 0 ? [] : ["", "Stages:", ...stages.map(([domain, stage]) => `  ${domain}: ${stage}`)]),
    ...(result.confidenceNotes.length === 0
      ? []
      : ["", "Confidence notes:", ...result.confidenceNotes.map((note) => `  ${note}`)]),
    "",
    "Next command:",
    "  vivarium identity summary --state-path <state.db>",
    "",
  ].join("\n");
}
