import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocalWorldReader } from "./local-reader.js";
import { proposeAntiPattern } from "./push.js";
import { publishRun } from "./runs.js";

describe("local world reader", () => {
  test("retrieves seeded skills, anti-patterns, and traces by domain and query", () => {
    const world = createLocalWorldReader({ root: "../the-world" });

    const results = world.search({ domain: "coding", query: "test before implementation" });

    expect(results.some((result) => result.kind === "skill" && result.title.includes("Red Green"))).toBe(true);
    expect(results.some((result) => result.kind === "anti-pattern")).toBe(true);
    expect(results.some((result) => result.kind === "trace")).toBe(true);
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
});
