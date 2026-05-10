import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalWorldReader } from "./local-reader.js";
import { proposeAntiPattern, proposeRun, proposeTrace } from "./push.js";
import { publishRun } from "./runs.js";

describe("local world reader", () => {
  test("retrieves seeded skills, anti-patterns, and traces by domain and query", () => {
    const world = createLocalWorldReader({ root: "../the-world" });

    const results = world.search({ domain: "coding", query: "test before implementation" });

    expect(results.some((result) => result.kind === "skill" && result.title.includes("Red Green"))).toBe(true);
    expect(results.some((result) => result.kind === "anti-pattern")).toBe(true);
    expect(results.some((result) => result.kind === "trace")).toBe(true);
  });

  test("deprioritizes stale skills without hiding them", () => {
    const root = mkdtempSync(join(tmpdir(), "world-reader-stale-"));
    const staleDirectory = join(root, "domains", "coding", "skills", "aaa-stale");
    const freshDirectory = join(root, "domains", "coding", "skills", "zzz-fresh");
    mkdirSync(staleDirectory, { recursive: true });
    mkdirSync(freshDirectory, { recursive: true });
    writeFileSync(
      join(staleDirectory, "SKILL.md"),
      "---\nname: Stale Deployment Skill\ndescription: deployment health check\nstale: true\n---\n\n# Stale Deployment Skill\n\nUse deployment health check evidence.\n",
    );
    writeFileSync(
      join(freshDirectory, "SKILL.md"),
      "---\nname: Fresh Deployment Skill\ndescription: deployment health check\n---\n\n# Fresh Deployment Skill\n\nUse deployment health check evidence.\n",
    );

    const results = createLocalWorldReader({ root }).search({
      domain: "coding",
      query: "deployment health check",
      limit: 2,
    });

    const fresh = results.find((result) => result.title === "Fresh Deployment Skill");
    const stale = results.find((result) => result.title === "Stale Deployment Skill");
    expect(results.map((result) => result.title)).toEqual(["Fresh Deployment Skill", "Stale Deployment Skill"]);
    expect(stale?.score).toBeLessThan(fresh?.score ?? 0);
  });

  test("retrieves published runs by domain and query", () => {
    const root = mkdtempSync(join(tmpdir(), "world-reader-runs-"));
    publishRun({
      worldRoot: root,
      runId: "run-published",
      domain: "coding",
      goal: "debug a flaky deployment",
      outcome: "isolated the failing health check",
    });
    publishRun({
      worldRoot: root,
      runId: "run-research",
      domain: "research",
      goal: "summarize a paper",
      outcome: "wrote the abstract",
    });

    const results = createLocalWorldReader({ root }).search({
      domain: "coding",
      query: "flaky health check",
    });

    expect(results).toEqual([
      expect.objectContaining({
        kind: "run",
        id: "runs/run-published/RUN.md",
        title: "debug a flaky deployment",
      }),
    ]);
  });

  test("retrieves proposed anti-patterns by domain and query", () => {
    const root = mkdtempSync(join(tmpdir(), "world-reader-anti-pattern-proposal-"));
    proposeAntiPattern({
      worldRoot: root,
      domain: "coding",
      slug: "retrying-without-new-evidence",
      name: "Retrying Without New Evidence",
      description: "Repeating a failed action without a new observation.",
      why: "Repeated retries compound uncertainty.",
      insteadDo: "Gather fresh evidence before trying again.",
      contributor: "agent-a",
      evidenceRunIds: ["run-retry-loop"],
    });

    const results = createLocalWorldReader({ root }).search({
      domain: "coding",
      query: "retry fresh evidence",
    });

    expect(results).toEqual([
      expect.objectContaining({
        kind: "anti-pattern",
        id: "proposals/anti-patterns/coding/retrying-without-new-evidence/ANTI-PATTERN.md",
        title: "Retrying Without New Evidence",
      }),
    ]);
  });

  test("retrieves proposed traces by domain and query", () => {
    const root = mkdtempSync(join(tmpdir(), "world-reader-trace-proposal-"));
    proposeTrace({
      worldRoot: root,
      domain: "coding",
      slug: "trace-from-dream",
      title: "Trace From Dream",
      contributor: "agent-a",
      steps: [
        { action: "Frame the failure", annotation: "Name the expected behavior before editing." },
        { action: "Validate the fix", annotation: "Run the command that would have caught the bug." },
      ],
      evidenceRunId: "run-instructive",
    });

    const results = createLocalWorldReader({ root }).search({
      domain: "coding",
      query: "expected behavior editing",
    });

    expect(results).toEqual([
      expect.objectContaining({
        kind: "trace",
        id: "proposals/traces/coding/trace-from-dream/TRACE.md",
        title: "Trace From Dream",
      }),
    ]);
  });

  test("retrieves proposed runs by domain and query", () => {
    const root = mkdtempSync(join(tmpdir(), "world-reader-run-proposal-"));
    proposeRun({
      worldRoot: root,
      runId: "run-publishable",
      domain: "coding",
      goal: "Debug a reusable deployment failure",
      outcome: "Captured the health-check guardrail.",
      contributor: "agent-a",
      body: "Redacted transcript with deployment health-check evidence.",
      sourceRunId: "run-local",
    });

    const results = createLocalWorldReader({ root }).search({
      domain: "coding",
      query: "deployment health-check",
    });

    expect(results).toEqual([
      expect.objectContaining({
        kind: "run",
        id: "proposals/runs/run-publishable/RUN.md",
        title: "Debug a reusable deployment failure",
      }),
    ]);
  });
});
