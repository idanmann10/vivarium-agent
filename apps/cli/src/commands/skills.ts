import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import type { LocalSkillStatus } from "../../../../packages/state/src/repository.js";
import { renderVivariumGlobe } from "./branding.js";

export interface ListSkillsCommandOptions {
  readonly statePath: string;
  readonly domain?: string;
}

export interface ListedSkill {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly status: LocalSkillStatus;
  readonly habitual: boolean;
}

export interface ListSkillsCommandResult {
  readonly skills: readonly ListedSkill[];
}

export function listSkillsCommand(options: ListSkillsCommandOptions): ListSkillsCommandResult {
  const state = new SQLiteStateRepository(options.statePath);
  const skills = state
    .listLocalSkills()
    .filter((skill) => options.domain === undefined || skill.domain === options.domain)
    .map((skill) => ({
      id: String(skill.id),
      name: skill.name,
      domain: skill.domain,
      status: skill.status,
      habitual: skill.habitual,
    }));
  state.close();
  return { skills };
}

function renderSkill(skill: ListedSkill): readonly string[] {
  return [
    `  ${skill.name}`,
    `    ID: ${skill.id}`,
    `    Domain: ${skill.domain}`,
    `    Status: ${skill.status}`,
    `    Habitual: ${skill.habitual ? "yes" : "no"}`,
  ];
}

export function renderListSkillsCommandResult(result: ListSkillsCommandResult): string {
  return [
    renderVivariumGlobe(),
    "",
    "Vivarium Skills",
    "---------------",
    `Skills: ${result.skills.length}`,
    ...(result.skills.length === 0
      ? [
          "",
          "Next command:",
          "  vivarium init --domain coding",
        ]
      : ["", ...result.skills.flatMap(renderSkill)]),
    "",
  ].join("\n");
}
