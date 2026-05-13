import { describe, expect, test } from "bun:test";

import {
  renderCurriculumProgressCommandResult,
  renderCurriculumReadCommandResult,
} from "./curriculum.js";

describe("curriculum commands", () => {
  test("renders curriculum content as branded terminal output", () => {
    const output = renderCurriculumReadCommandResult({
      domain: "coding",
      path: "/tmp/world/domains/coding/curriculum.md",
      body: "# Coding Curriculum\n\n- Write tests first.\n",
    });

    expect(output).toContain("Vivarium Curriculum");
    expect(output).toContain("Domain: coding");
    expect(output).toContain("Status: found");
    expect(output).toContain("# Coding Curriculum");
    expect(output.trim().startsWith("{")).toBe(false);
  });

  test("renders curriculum progress as terminal output", () => {
    const output = renderCurriculumProgressCommandResult({
      domain: "coding",
      progress: { domain: "coding", currentStepIndex: 2, completedSteps: [0, 2], startedAt: "local" },
    });

    expect(output).toContain("Vivarium Curriculum");
    expect(output).toContain("Current step: 2");
    expect(output).toContain("Completed steps: 0, 2");
    expect(output.trim().startsWith("{")).toBe(false);
  });
});
