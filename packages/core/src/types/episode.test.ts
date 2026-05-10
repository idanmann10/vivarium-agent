import { describe, expect, test } from "bun:test";

import { agentId, episodeId, runId, skillId, traceId } from "../ids.js";
import { episodeShapeManifest, type Episode, type EpisodeKind } from "./episode.js";

const base = {
  id: episodeId("episode-shape"),
  runId: runId("run-shape"),
  agentId: agentId("agent-shape"),
  timestamp: "2026-05-10T00:00:00.000Z",
  tags: ["shape"],
} as const;

const episodeSamples = {
  run_start: { ...base, kind: "run_start", goal: "ship v1", domain: "coding" },
  plan: {
    ...base,
    kind: "plan",
    plan: "Use test-first development.",
    skillsLoaded: [skillId("skill-tdd")],
    tracesLoaded: [traceId("trace-cli")],
  },
  prediction: {
    ...base,
    kind: "prediction",
    prediction: { about: "test", expected: "fails first", confidence: 0.75 },
  },
  action: { ...base, kind: "action", tool: "terminal", args: { cmd: "bun test" } },
  observation: { ...base, kind: "observation", content: { output: "pass" } },
  surprise: {
    ...base,
    kind: "surprise",
    prediction: { about: "test", expected: "passes", confidence: 0.9 },
    actual: "failed",
    magnitude: 0.6,
    notes: "schema guard caught it",
  },
  monitor_signal: { ...base, kind: "monitor_signal", offTrackScore: 0.8, reasons: ["tool failed"] },
  recovery: { ...base, kind: "recovery", decision: "replan", reason: "tool failure" },
  validation: { ...base, kind: "validation", score: 0.8, passed: true, reasons: ["tests passed"] },
  skill_used: { ...base, kind: "skill_used", skillId: skillId("skill-tdd"), helped: true },
  reflection: {
    ...base,
    kind: "reflection",
    reflection: {
      worked: ["test-first"],
      didntWork: [],
      surprises: [],
      skillCandidates: [],
      skillRefinements: [],
      skillPrunings: [],
      antiPatternCandidates: [],
      scaffoldingGaps: [],
      publishable: false,
    },
  },
  refusal: { ...base, kind: "refusal", reason: "harmful request", category: "harmful" },
  run_end: { ...base, kind: "run_end", success: true, score: 0.8 },
} as const satisfies { readonly [Kind in EpisodeKind]: Extract<Episode, { readonly kind: Kind }> };

function sortedKeys(value: object): readonly string[] {
  return Object.keys(value).sort();
}

describe("episode shape manifest", () => {
  test("snapshots every episode kind and field set", () => {
    expect(Object.keys(episodeShapeManifest).sort()).toEqual(Object.keys(episodeSamples).sort());

    for (const [kind, fields] of Object.entries(episodeShapeManifest)) {
      expect(sortedKeys(episodeSamples[kind as EpisodeKind])).toEqual([...fields].sort());
    }

    expect(episodeShapeManifest).toEqual({
      action: ["id", "runId", "agentId", "timestamp", "tags", "kind", "tool", "args"],
      monitor_signal: ["id", "runId", "agentId", "timestamp", "tags", "kind", "offTrackScore", "reasons"],
      observation: ["id", "runId", "agentId", "timestamp", "tags", "kind", "content"],
      plan: ["id", "runId", "agentId", "timestamp", "tags", "kind", "plan", "skillsLoaded", "tracesLoaded"],
      prediction: ["id", "runId", "agentId", "timestamp", "tags", "kind", "prediction"],
      recovery: ["id", "runId", "agentId", "timestamp", "tags", "kind", "decision", "reason"],
      reflection: ["id", "runId", "agentId", "timestamp", "tags", "kind", "reflection"],
      refusal: ["id", "runId", "agentId", "timestamp", "tags", "kind", "reason", "category"],
      run_end: ["id", "runId", "agentId", "timestamp", "tags", "kind", "success", "score"],
      run_start: ["id", "runId", "agentId", "timestamp", "tags", "kind", "goal", "domain"],
      skill_used: ["id", "runId", "agentId", "timestamp", "tags", "kind", "skillId", "helped"],
      surprise: ["id", "runId", "agentId", "timestamp", "tags", "kind", "prediction", "actual", "magnitude", "notes"],
      validation: ["id", "runId", "agentId", "timestamp", "tags", "kind", "score", "passed", "reasons"],
    });
  });
});
