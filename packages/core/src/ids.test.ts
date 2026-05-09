import { describe, expect, test } from "bun:test";

import {
  agentId,
  contributorId,
  runId,
  skillId,
  worldRef,
} from "./ids.js";

describe("branded ID factories", () => {
  test("accept non-empty trimmed identifiers", () => {
    expect(String(agentId("agent-local-1"))).toBe("agent-local-1");
    expect(String(runId("run_2026_05_09"))).toBe("run_2026_05_09");
    expect(String(skillId("coding.inspect-before-edit"))).toBe("coding.inspect-before-edit");
    expect(String(contributorId("obra"))).toBe("obra");
    expect(String(worldRef("owner/repo@main"))).toBe("owner/repo@main");
  });

  test("reject blank identifiers", () => {
    expect(() => agentId(" ")).toThrow("AgentId cannot be blank");
  });
});
