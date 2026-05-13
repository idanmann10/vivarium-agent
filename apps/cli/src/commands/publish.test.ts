import { describe, expect, test } from "bun:test";

import {
  renderPublishListCommandResult,
  renderPublishRunCommandResult,
  renderPublishTraceCommandResult,
} from "./publish.js";

describe("publish commands", () => {
  test("renders queued publishables as branded terminal output", () => {
    const output = renderPublishListCommandResult({
      publishables: [{ kind: "run", path: "runs/run-1/RUN.md", body: "redacted body" }],
    });

    expect(output).toContain("Vivarium Publish");
    expect(output).toContain("Publishables: 1");
    expect(output).toContain("runs/run-1/RUN.md");
    expect(output.trim().startsWith("{")).toBe(false);
  });

  test("renders published run and trace results as terminal output", () => {
    const run = renderPublishRunCommandResult({
      target: { label: "canonical", root: "/tmp/world", priority: 1 },
      path: "/tmp/world/proposals/runs/run-1/RUN.md",
    });
    const trace = renderPublishTraceCommandResult({
      target: { label: "private", root: "/tmp/private-world", priority: 0, autoPushEnabled: true },
      path: "/tmp/private-world/proposals/traces/coding/trace-1/TRACE.md",
    });

    expect(run).toContain("Vivarium Publish Run");
    expect(run).toContain("Target: canonical");
    expect(run).toContain("/tmp/world/proposals/runs/run-1/RUN.md");
    expect(run.trim().startsWith("{")).toBe(false);
    expect(trace).toContain("Vivarium Publish Trace");
    expect(trace).toContain("Target: private");
    expect(trace).toContain("Auto-push: enabled");
    expect(trace.trim().startsWith("{")).toBe(false);
  });
});
