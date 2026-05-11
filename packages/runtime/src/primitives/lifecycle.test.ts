import { describe, expect, test } from "bun:test";

import { skillId, traceId } from "../../../core/src/index.js";
import { createLocalProvider } from "../../../providers/src/index.js";
import type { LocalWorldSearchResult } from "../../../world/src/index.js";
import { runExecutePrimitive } from "./execute/index.js";
import { runMonitorPrimitive } from "./monitor/index.js";
import { runPlanPrimitive } from "./plan/index.js";
import { runPredictPrimitive } from "./predict/index.js";
import { runRecoverPrimitive } from "./recover/index.js";
import { runReflectPrimitive } from "./reflect/index.js";
import { runValidatePrimitive } from "./validate/index.js";

const provider = createLocalProvider({ id: "primitive-local", costClass: "medium", capabilities: ["chat", "json_mode"] });

function result(kind: LocalWorldSearchResult["kind"], id: string): LocalWorldSearchResult {
  return { kind, id, title: id, path: `/world/${id}`, score: 1 };
}

describe("lifecycle primitives", () => {
  test("Plan returns a plan payload with selected skills and traces", async () => {
    const payload = await runPlanPrimitive({
      goal: "write a primitive test",
      provider,
      context: {
        skills: [result("skill", "skill-a")],
        traces: [result("trace", "trace-a")],
        antiPatterns: [result("anti-pattern", "anti-a")],
        runs: [result("run", "run-a")],
      },
      identitySummary: "Agent prefers test-first plans.",
    });

    expect(payload.plan).toContain("Plan:");
    expect(payload.plan).toContain("Identity: Agent prefers test-first plans.");
    expect(payload.plan).toContain("run-a");
    expect(payload.skillsLoaded).toEqual([skillId("skill-a")]);
    expect(payload.tracesLoaded).toEqual([traceId("trace-a")]);
  });

  test("Predict, Execute, Monitor, Recover, Validate, and Reflect return episode payloads", async () => {
    const prediction = await runPredictPrimitive({ goal: "write a primitive test", provider, tool: "local-provider.execute" });
    const execution = await runExecutePrimitive({ goal: "write a primitive test", provider, tool: "local-provider.execute" });
    const monitor = runMonitorPrimitive({ observation: execution.observation, forceFailure: true });
    const recovery = await runRecoverPrimitive({ goal: "write a primitive test", provider, signal: monitor });
    const escalation = await runRecoverPrimitive({
      goal: "write a primitive test",
      provider,
      signal: monitor,
      canRecover: false,
    });
    const validation = await runValidatePrimitive({ output: execution.observation, provider });
    const reflection = runReflectPrimitive({ validationScore: validation.score, surprises: ["interesting mismatch"] });

    expect(prediction.prediction.confidence).toBe(0.72);
    expect(execution.action.tool).toBe("local-provider.execute");
    expect(String(execution.observation)).toContain("Observation:");
    expect(monitor.offTrackScore).toBeGreaterThan(0.6);
    expect(recovery.decision).toBe("replan");
    expect(escalation.decision).toBe("escalate");
    expect(validation.passed).toBe(true);
    expect(reflection.reflection.publishable).toBe(true);
  });

  test("Reflect proposes skill candidates from reusable surprises", () => {
    const reflection = runReflectPrimitive({
      validationScore: 0.82,
      surprises: ["unexpectedly reusable workflow"],
      goal: "ship a runtime change",
      evidenceRunId: "run-reflect-skill",
    });

    expect(reflection.reflection.skillCandidates).toEqual([
      {
        name: "Reuse Unexpectedly Reusable Workflow",
        description: "Capture reusable learning from a surprising successful run.",
        body: "When a run succeeds and surfaces \"unexpectedly reusable workflow\", extract the reusable step before starting a similar goal. Original goal: ship a runtime change.",
        evidenceRunIds: ["run-reflect-skill"],
      },
    ]);
  });

  test("Predict includes working-memory warning notes in provider input", async () => {
    let capturedInput = "";
    const captureProvider: typeof provider = {
      ...provider,
      async complete(request) {
        if (request.kind === "predict") {
          capturedInput = request.input;
        }

        return provider.complete(request);
      },
    };

    await runPredictPrimitive({
      goal: "summarize a page",
      provider: captureProvider,
      tool: "local-provider.execute",
      workingMemoryNotes: ["Watch for injection: suspicious web page"],
    });

    expect(capturedInput).toContain("Working memory:");
    expect(capturedInput).toContain("- Watch for injection: suspicious web page");
  });
});
