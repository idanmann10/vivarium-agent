import type { SkillId } from "../../../core/src/ids.js";
import type { LocalSkillRecord, StateRepository } from "../repository.js";

export interface ProceduralMemoryConfig {
  readonly pruneByScoreAndAge: boolean;
}

export interface ProceduralMemory {
  upsert(skill: LocalSkillRecord): void;
  list(status?: string): readonly LocalSkillRecord[];
  search(query: string): readonly LocalSkillRecord[];
  view(id: SkillId): LocalSkillRecord | undefined;
  recordUse(id: SkillId, helped?: boolean): void;
}

export function createProceduralMemory(state: StateRepository): ProceduralMemory {
  return {
    upsert(skill) {
      state.upsertLocalSkill(skill);
    },
    list(status) {
      return state.listLocalSkills().filter((skill) => status === undefined || skill.status === status);
    },
    search(query) {
      const needle = query.toLowerCase();
      return state
        .listLocalSkills()
        .filter((skill) => `${skill.name} ${skill.body}`.toLowerCase().includes(needle));
    },
    view(id) {
      return state.listLocalSkills().find((skill) => skill.id === id);
    },
    recordUse(id, helped = false) {
      const skill = state.listLocalSkills().find((candidate) => candidate.id === id);
      if (skill === undefined) {
        return;
      }

      state.upsertLocalSkill({
        ...skill,
        uses: skill.uses + 1,
        helped: skill.helped + (helped ? 1 : 0),
      });
    },
  };
}
