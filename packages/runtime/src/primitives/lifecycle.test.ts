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
      },
    });

    expect(payload.plan).toContain("Plan:");
    expect(payload.skillsLoaded).toEqual([skillId("skill-a")]);
    expect(payload.tracesLoaded).toEqual([traceId("trace-a")]);
  });

  test("Predict, Execute, Monitor, Recover, Validate, and Reflect return episode payloads", async () => {
    const prediction = await runPredictPrimitive({ goal: "write a primitive test", provider, tool: "local-provider.execute" });
    const execution = await runExecutePrimitive({ goal: "write a primitive test", provider, tool: "local-provider.execute" });
    const monitor = runMonitorPrimitive({ observation: execution.observation, forceFailure: true });
    const recovery = await runRecoverPrimitive({ goal: "write a primitive test", provider, signal: monitor });
    const validation = await runValidatePrimitive({ output: execution.observation, provider });
    const reflection = runReflectPrimitive({ validationScore: validation.score, surprises: ["interesting mismatch"] });

    expect(prediction.prediction.confidence).toBe(0.72);
    expect(execution.action.tool).toBe("local-provider.execute");
    expect(String(execution.observation)).toContain("Observation:");
    expect(monitor.offTrackScore).toBeGreaterThan(0.6);
    expect(recovery.decision).toBe("replan");
    expect(validation.passed).toBe(true);
    expect(reflection.reflection.publishable).toBe(true);
  });
});
