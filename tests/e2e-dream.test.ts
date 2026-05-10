import { describe, expect, test } from "bun:test";

import { runCompoundingEvaluation } from "../packages/eval/src/index.js";
import { agentId, skillId } from "../packages/core/src/index.js";
import { runDream } from "../packages/runtime/src/index.js";
import { InMemoryStateRepository } from "../packages/state/src/index.js";
import { anonymizeText } from "../packages/tools/src/index.js";

describe("dream e2e", () => {
  test("consolidates skills and queues anonymized publishable artifact", () => {
    const state = new InMemoryStateRepository();
    state.setIdentity({
      agentId: agentId("agent-dream-e2e"),
      name: "agent-dream-e2e",
      devStages: { coding: "newborn" },
      runsCompleted: 0,
      summary: "Newborn.",
      updatedAt: "local",
    });
    state.upsertLocalSkill({
      id: skillId("coding.promote-me"),
      name: "Promote Me",
      domain: "coding",
      status: "candidate",
      uses: 5,
      helped: 5,
      lastUsedRunOffset: 0,
      habitual: false,
      body: "Useful behavior.",
    });

    const dream = runDream({
      state,
      domainStats: { coding: { runsCompleted: 8, successRate: 0.75, skillDiversity: 5 } },
    });
    state.queuePublishableArtifact({
      kind: "run",
      path: "runs/local-dream",
      body: anonymizeText("Contact idan@example.com with Bearer sk-token from /Users/idanmann/project"),
    });

    const compounding = runCompoundingEvaluation({
      benchmarkName: "dream-compounding",
      cases: [
        {
          id: "promote-local-skill",
          domain: "coding",
          before: { proceduralHits: 0, validationScore: 0.6 },
          after: {
            proceduralHits: state.listLocalSkills().filter((skill) => skill.status === "promoted").length,
            validationScore: 0.8,
          },
        },
      ],
    });

    expect(dream.promoted).toEqual(["coding.promote-me"]);
    expect(state.getIdentity()?.devStages.coding).toBe("journeyman");
    expect(state.listPublishableArtifacts()[0]?.body).toContain("[REDACTED_EMAIL]");
    expect(compounding.improved).toBe(true);
    expect(compounding.cases[0]?.id).toBe("promote-local-skill");
  });
});
