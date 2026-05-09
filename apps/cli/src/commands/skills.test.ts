import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { skillId } from "../../../../packages/core/src/index.js";
import { SQLiteStateRepository } from "../../../../packages/state/src/index.js";
import { listSkillsCommand } from "./skills.js";

describe("skills commands", () => {
  test("lists local skills from SQLite state by domain", () => {
    const statePath = join(mkdtempSync(join(tmpdir(), "cli-skills-")), "state.db");
    const state = new SQLiteStateRepository(statePath);
    state.upsertLocalSkill({
      id: skillId("coding.tdd"),
      name: "TDD",
      domain: "coding",
      status: "promoted",
      uses: 3,
      helped: 3,
      lastUsedRunOffset: 0,
      habitual: true,
      body: "Write the test first.",
    });
    state.close();

    expect(listSkillsCommand({ statePath, domain: "coding" })).toEqual({
      skills: [{ id: "coding.tdd", name: "TDD", domain: "coding", status: "promoted", habitual: true }],
    });
  });
});
