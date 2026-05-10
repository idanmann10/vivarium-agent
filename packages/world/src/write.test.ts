import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  proposeAntiPattern,
  proposeRun,
  proposeSkill,
  proposeSkillPullRequest,
  proposeSkillToSubscribedWorld,
  proposeTrace,
  selectProposalWorldTarget,
} from "./push.js";
import { publishRun } from "./runs.js";
import { publishTrace } from "./traces.js";

describe("local world writes", () => {
  test("proposes a skill and publishes run and trace artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-"));

    const skillPath = proposeSkill({
      worldRoot: root,
      domain: "coding",
      slug: "local-skill",
      name: "Local Skill",
      description: "A locally proposed skill.",
      body: "Use local evidence.",
      contributor: "agent-a",
    });
    const runPath = publishRun({
      worldRoot: root,
      runId: "run-local",
      domain: "coding",
      goal: "prove publishing",
      outcome: "published locally",
    });
    const tracePath = publishTrace({
      worldRoot: root,
      domain: "coding",
      slug: "trace-local",
      title: "Trace Local",
      steps: ["frame", "act", "validate"],
    });

    expect(readFileSync(skillPath, "utf8")).toContain("# Local Skill");
    expect(readFileSync(runPath, "utf8")).toContain("# Outcome");
    expect(readFileSync(tracePath, "utf8")).toContain("# Goal");
  });

  test("routes public and internal skill proposals to the correct subscribed world", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-targets-"));
    const canonicalWorld = join(root, "canonical");
    const privateWorld = join(root, "private");
    const worlds = [
      { label: "private", root: privateWorld, priority: 0, autoPushEnabled: true },
      { label: "canonical", root: canonicalWorld, priority: 1, autoPushEnabled: false },
    ];

    expect(selectProposalWorldTarget({ worlds, visibility: "internal" })).toEqual(worlds[0]!);
    expect(selectProposalWorldTarget({ worlds, visibility: "public" })).toEqual(worlds[1]!);

    const internal = proposeSkillToSubscribedWorld({
      worlds,
      visibility: "internal",
      domain: "coding",
      slug: "internal-skill",
      name: "Internal Skill",
      description: "An internal-only skill.",
      body: "Use private context.",
      contributor: "agent-a",
    });
    const publicProposal = proposeSkillToSubscribedWorld({
      worlds,
      visibility: "public",
      domain: "coding",
      slug: "public-skill",
      name: "Public Skill",
      description: "A public skill.",
      body: "Use shared context.",
      contributor: "agent-a",
    });

    expect(internal.target.label).toBe("private");
    expect(internal.path).toBe(join(privateWorld, "proposals", "skills", "coding", "internal-skill", "SKILL.md"));
    expect(readFileSync(internal.path, "utf8")).toContain("visibility: internal");
    expect(publicProposal.target.label).toBe("canonical");
    expect(publicProposal.path).toBe(join(canonicalWorld, "proposals", "skills", "coding", "public-skill", "SKILL.md"));
    expect(readFileSync(publicProposal.path, "utf8")).toContain("visibility: public");
  });

  test("proposes an anti-pattern artifact with evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-anti-pattern-"));

    const path = proposeAntiPattern({
      worldRoot: root,
      domain: "coding",
      slug: "retrying-without-new-evidence",
      name: "Retrying Without New Evidence",
      description: "Repeating the same failing action without new evidence",
      why: "It burns time and compounds the original uncertainty.",
      insteadDo: "Gather a new observation before retrying.",
      contributor: "agent-a",
      evidenceRunIds: ["run-failed-retry"],
    });

    expect(path).toBe(
      join(root, "proposals", "anti-patterns", "coding", "retrying-without-new-evidence", "ANTI-PATTERN.md"),
    );
    expect(readFileSync(path, "utf8")).toContain("id: coding.retrying-without-new-evidence");
    expect(readFileSync(path, "utf8")).toContain("contributor: agent-a");
    expect(readFileSync(path, "utf8")).toContain("## What Not To Do\n\nRepeating the same failing action without new evidence");
    expect(readFileSync(path, "utf8")).toContain("## Evidence\n\n- run-failed-retry");
  });

  test("proposes a trace artifact with annotated steps", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-trace-proposal-"));

    const path = proposeTrace({
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

    expect(path).toBe(join(root, "proposals", "traces", "coding", "trace-from-dream", "TRACE.md"));
    expect(readFileSync(path, "utf8")).toContain("id: coding.trace-from-dream");
    expect(readFileSync(path, "utf8")).toContain("contributor: agent-a");
    expect(readFileSync(path, "utf8")).toContain("## Step 1\n\nFrame the failure\n\nAnnotation: Name the expected behavior before editing.");
    expect(readFileSync(join(root, "proposals", "traces", "coding", "trace-from-dream", "steps.jsonl"), "utf8")).toContain(
      '"annotation":"Run the command that would have caught the bug."',
    );
    expect(readFileSync(join(root, "proposals", "traces", "coding", "trace-from-dream", "meta.yaml"), "utf8")).toContain(
      "evidence_run_id: run-instructive",
    );
  });

  test("proposes a run artifact with redacted body and metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-run-proposal-"));

    const path = proposeRun({
      worldRoot: root,
      runId: "run-publishable",
      domain: "coding",
      goal: "Debug a reusable deployment failure",
      outcome: "Captured the health-check guardrail.",
      contributor: "agent-a",
      body: "Redacted run transcript.",
      sourceRunId: "run-local",
    });

    expect(path).toBe(join(root, "proposals", "runs", "run-publishable", "RUN.md"));
    expect(readFileSync(path, "utf8")).toContain("# Goal\n\nDebug a reusable deployment failure");
    expect(readFileSync(path, "utf8")).toContain("# Outcome\n\nCaptured the health-check guardrail.");
    expect(readFileSync(path, "utf8")).toContain("# Transcript\n\nRedacted run transcript.");
    expect(readFileSync(join(root, "proposals", "runs", "run-publishable", "episodes.jsonl"), "utf8")).toContain(
      '"kind":"run_proposal"',
    );
    expect(readFileSync(join(root, "proposals", "runs", "run-publishable", "meta.yaml"), "utf8")).toContain(
      "source_run_id: run-local",
    );
  });

  test("opens a skill proposal pull request when the push gate passes", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-pr-"));
    const calls: unknown[] = [];

    const result = await proposeSkillPullRequest({
      worldRoot: root,
      domain: "coding",
      slug: "gated-skill",
      name: "Gated Skill",
      description: "A push-gated skill.",
      body: "Use evidence before pushing.",
      contributor: "agent-a",
      gate: { lowerBound: 0.6, uses: 5, coverage: 0.5 },
      client: {
        createPullRequest: async (request) => {
          calls.push(request);
          return { url: "https://github.example/pulls/7", number: 7 };
        },
      },
      head: "agent-a:gated-skill",
      base: "main",
    });

    expect(calls).toEqual([
      {
        title: "Add skill: Gated Skill",
        body: expect.stringContaining("proposals/skills/coding/gated-skill/SKILL.md"),
        head: "agent-a:gated-skill",
        base: "main",
      },
    ]);
    expect(result).toEqual({
      pushed: true,
      path: join(root, "proposals", "skills", "coding", "gated-skill", "SKILL.md"),
      gate: { lowerBound: 0.6, uses: 5, coverage: 0.5 },
      pullRequest: { url: "https://github.example/pulls/7", number: 7 },
    });
    expect(readFileSync(result.path, "utf8")).toContain("contributor_trust: 0.5");
    expect(readFileSync(result.path, "utf8")).toContain("effective_lb: 0.6");
    expect(readFileSync(result.path, "utf8")).toContain("regression_votes: 0");
    expect(readFileSync(result.path, "utf8")).toContain("positive_validators: 0");
    expect(readFileSync(result.path, "utf8")).toContain("validator_votes_json: []");
  });

  test("does not open a skill proposal pull request when the push gate fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "world-write-no-pr-"));
    let called = false;

    const result = await proposeSkillPullRequest({
      worldRoot: root,
      domain: "coding",
      slug: "ungated-skill",
      name: "Ungated Skill",
      description: "A skill without enough evidence.",
      body: "Keep learning locally.",
      contributor: "agent-a",
      gate: { lowerBound: 0.59, uses: 5, coverage: 0.5 },
      client: {
        createPullRequest: async () => {
          called = true;
          return { url: "https://github.example/pulls/8", number: 8 };
        },
      },
      head: "agent-a:ungated-skill",
      base: "main",
    });

    expect(called).toBe(false);
    expect(result).toEqual({
      pushed: false,
      path: join(root, "proposals", "skills", "coding", "ungated-skill", "SKILL.md"),
      gate: { lowerBound: 0.59, uses: 5, coverage: 0.5 },
      reason: "Push gate not satisfied",
    });
  });
});
