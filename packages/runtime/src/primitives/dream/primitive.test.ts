import { describe, expect, test } from "bun:test";

import { agentId, skillId } from "../../../../core/src/index.js";
import { InMemoryStateRepository } from "../../../../state/src/index.js";
import { runDream } from "./primitive.js";

describe("runDream", () => {
  test("promotes, prunes, habituates, updates identity, and summarizes confidence", () => {
    const state = new InMemoryStateRepository();
    state.setIdentity({
      agentId: agentId("agent-dream"),
      name: "agent-dream",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "Newborn local agent.",
      updatedAt: "local",
    });
    state.upsertLocalSkill({
      id: skillId("coding.candidate"),
      name: "Candidate Skill",
      domain: "coding",
      status: "candidate",
      uses: 5,
      helped: 5,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Useful candidate.",
    });
    state.upsertLocalSkill({
      id: skillId("coding.weak"),
      name: "Weak Skill",
      domain: "coding",
      status: "promoted",
      uses: 10,
      helped: 1,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Weak skill.",
    });
    state.upsertLocalSkill({
      id: skillId("coding.habit"),
      name: "Habit Skill",
      domain: "coding",
      status: "promoted",
      uses: 40,
      helped: 38,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Frequently useful.",
    });
    state.recordPredictionOutcome({ confidence: 0.76, correct: false });
    state.recordPredictionOutcome({ confidence: 0.72, correct: false });

    const result = runDream({
      state,
      domainStats: {
        coding: {
          runsCompleted: 10,
          successRate: 0.8,
          skillDiversity: 4,
        },
      },
    });

    expect(result.promoted).toContain("coding.candidate");
    expect(result.pruned).toContain("coding.weak");
    expect(result.habitual).toContain("coding.habit");
    expect(result.identitySummary).toContain("coding");
    expect(result.devStages.coding).toBe("journeyman");
    expect(result.confidenceNotes[0]).toContain("0.7-0.8");
    expect(state.listLocalSkills().find((skill) => String(skill.id) === "coding.candidate")?.status).toBe("promoted");
    expect(state.listLocalSkills().find((skill) => String(skill.id) === "coding.weak")?.status).toBe("archived");
  });
});
