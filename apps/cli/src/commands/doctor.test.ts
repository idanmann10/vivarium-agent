import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { doctorCommand, type DoctorCommandRunner } from "./doctor.js";

const blockedRunner: DoctorCommandRunner = ({ command, args, cwd }) => {
  const text = [command, ...args].join(" ");

  if (text === "git remote -v" && cwd === "/agent") {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (text === "git remote -v" && cwd === "/world") {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  if (text === "gh auth status") {
    return { exitCode: 1, stdout: "", stderr: "The token in default is invalid." };
  }

  if (text === "docker --version") {
    return { exitCode: 0, stdout: "Docker version 29.4.1, build 055a478ea9", stderr: "" };
  }

  if (text === "docker compose version") {
    return { exitCode: 1, stdout: "", stderr: "docker: unknown command: docker compose" };
  }

  if (text === "docker-compose version") {
    return { exitCode: 1, stdout: "", stderr: "" };
  }

  return { exitCode: 127, stdout: "", stderr: `unexpected command: ${text}` };
};

const mismatchedRemoteRunner: DoctorCommandRunner = (run) => {
  const text = [run.command, ...run.args].join(" ");
  if (text === "git remote -v" && run.cwd === "/agent") {
    return {
      exitCode: 0,
      stdout: "origin\tgit@github.com:owner/wrong-agent.git (fetch)\norigin\tgit@github.com:owner/wrong-agent.git (push)\n",
      stderr: "",
    };
  }

  if (text === "git remote -v" && run.cwd === "/world") {
    return {
      exitCode: 0,
      stdout: "origin\thttps://github.com/other/world-final.git (fetch)\norigin\thttps://github.com/other/world-final.git (push)\n",
      stderr: "",
    };
  }

  return blockedRunner(run);
};

const readyRunner: DoctorCommandRunner = (run) => {
  const text = [run.command, ...run.args].join(" ");
  if (text === "git remote -v" && run.cwd === "/agent") {
    return {
      exitCode: 0,
      stdout: "origin\tgit@github.com:owner/agent-final.git (fetch)\norigin\tgit@github.com:owner/agent-final.git (push)\n",
      stderr: "",
    };
  }

  if (text === "git remote -v" && run.cwd === "/world") {
    return {
      exitCode: 0,
      stdout: "origin\tgit@github.com:owner/world-final.git (fetch)\norigin\tgit@github.com:owner/world-final.git (push)\n",
      stderr: "",
    };
  }

  if (text === "gh auth status") {
    return { exitCode: 0, stdout: "Logged in to github.com account owner", stderr: "" };
  }

  if (text === "docker --version") {
    return { exitCode: 0, stdout: "Docker version 29.4.1, build 055a478ea9", stderr: "" };
  }

  if (text === "docker compose version") {
    return { exitCode: 0, stdout: "Docker Compose version v2.32.4", stderr: "" };
  }

  return { exitCode: 127, stdout: "", stderr: `unexpected command: ${text}` };
};

const missingDockerRunner: DoctorCommandRunner = (run) => {
  const text = [run.command, ...run.args].join(" ");
  if (text === "docker --version" || text === "docker compose version" || text === "docker-compose version") {
    return { exitCode: 1, stdout: "", stderr: "missing docker" };
  }

  return blockedRunner(run);
};

function markdownHeadingAnchors(markdown: string): ReadonlySet<string> {
  return new Set(
    [...markdown.matchAll(/^##+ (.+)$/gm)].flatMap(([, heading]) =>
      heading === undefined
        ? []
        : [
            heading
              .replace(/`/g, "")
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-"),
          ],
    ),
  );
}

function writeLiveReadyFiles(root: string): Readonly<{
  subscriptionsPath: string;
  profilesPath: string;
  credentialsPath: string;
  evidencePath: string;
}> {
  const subscriptionsPath = join(root, "world-subscriptions.json");
  const profilesPath = join(root, "provider-profiles.json");
  const credentialsPath = join(root, "credentials.enc");
  const evidencePath = join(root, "v1-evidence.json");
  const localEvidencePaths = [
    "domains/coding/curriculum.md",
    ...Array.from({ length: 20 }, (_, index) => `domains/coding/skills/starter-${index + 1}/SKILL.md`),
    ...Array.from({ length: 3 }, (_, index) => `domains/coding/traces/starter-${index + 1}/TRACE.md`),
    "docs/live/starter-run-1.md",
    "docs/live/starter-run-2.md",
    "docs/live/goal-1.md",
    "docs/live/goal-2.md",
    "docs/live/goal-3.md",
    "docs/live/goal-4.md",
    "docs/live/goal-5.md",
    "docs/live/provider-anthropic.md",
    "docs/live/provider-openrouter.md",
    "docs/live/provider-private.md",
    "docs/live/internal-api-smoke.md",
    "docs/live/anti-pattern-avoided.md",
    "docs/live/anti-pattern-unfamiliar-territory.md",
    "docs/live/trace-a.md",
    "docs/live/trace-b.md",
    "docs/live/trace-similar-workflows.md",
    "docs/live/monitor-failure-pattern.md",
    "docs/live/recover-replan.md",
    "docs/live/destructive-hold.md",
    "docs/live/destructive-escalation.md",
    "docs/live/destructive-confirmation.md",
    "docs/live/destructive-continuation.md",
    "docs/live/refusal.md",
    "docs/live/skill-candidate-a.md",
    "docs/live/skill-candidate-b.md",
    "proposals/skills/coding/internal/SKILL.md",
    "docs/live/internal-skill-private-fork.md",
    "docs/live/internal-skill-canonical-absence.md",
    "proposals/skills/coding/public/SKILL.md",
    "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
    "proposals/traces/coding/workflow/TRACE.md",
    "docs/live/dream-trace-source-run.md",
    "docs/live/dream-trace-annotations.md",
    "domains/coding/skills/public/SKILL.md",
    "docs/live/math-gate.md",
    "docs/live/signal-1.md",
    "docs/live/signal-2.md",
    "docs/live/signal-3.md",
    "docs/live/signal-4.md",
    "docs/live/signal-5.md",
    "docs/live/external-pull-1.md",
    "docs/live/external-pull-2.md",
    "docs/live/external-pull-3.md",
    "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
    "domains/coding/traces/workflow/TRACE.md",
    "domains/coding/skills/public-variant/SKILL.md",
    "runs/run-live-001/RUN.md",
    "docs/live/trace-plan-read.md",
    "docs/live/run-plan-read.md",
    "featured/current.md",
    "domains/coding/anti-patterns/provider-quirk/ANTI-PATTERN.md",
    "STATS.md",
    "contributors/live-agent.json",
    "docs/live/similar-goals.md",
    "docs/live/refinement-1.md",
    "docs/live/refinement-2.md",
  ];

  writeFileSync(
    subscriptionsPath,
    `${JSON.stringify({
      worlds: [
        { label: "canonical", root: "/world", priority: 1, ref: "git@github.com:owner/world-final.git", autoPushEnabled: false },
        { label: "private", root: "/private-world", priority: 0, ref: "git@github.com:team/world-private.git", autoPushEnabled: true },
      ],
    })}\n`,
    "utf8",
  );
  writeFileSync(
    profilesPath,
    `${JSON.stringify({
      profiles: [
        { name: "anthropic-main", kind: "anthropic", apiKeyEnv: "ANTHROPIC_API_KEY", model: "claude-live", capabilities: ["chat"] },
        { name: "openrouter", kind: "openai-compat", apiKeyEnv: "OPENROUTER_API_KEY", model: "openrouter/live", capabilities: ["chat"] },
        {
          name: "private-finetune",
          kind: "openai-compat",
          apiKeyEnv: "VIVARIUM_OAI_COMPAT_API_KEY",
          model: "fine-tune",
          capabilities: ["chat"],
        },
      ],
    })}\n`,
    "utf8",
  );
  writeFileSync(credentialsPath, "encrypted credential bytes\n", "utf8");
  for (const path of localEvidencePaths) {
    const absolutePath = join(root, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, "live evidence placeholder\n", "utf8");
  }
  writeFileSync(
    evidencePath,
    `${JSON.stringify({
      starterPack: {
        primaryDomain: "coding",
        skillCount: 20,
        traceCount: 3,
        curriculum: "domains/coding/curriculum.md",
        skillReferences: Array.from({ length: 20 }, (_, index) => `domains/coding/skills/starter-${index + 1}/SKILL.md`),
        traceReferences: Array.from({ length: 3 }, (_, index) => `domains/coding/traces/starter-${index + 1}/TRACE.md`),
        firstRunReferences: ["docs/live/starter-run-1.md", "docs/live/starter-run-2.md"],
      },
      realGoals: [
        { id: "goal-1", goal: "Fix a flaky coding test", domain: "coding", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
        { id: "goal-2", goal: "Add a coding CLI command", domain: "coding", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
        { id: "goal-3", goal: "Refactor a coding module", domain: "coding", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
        { id: "goal-4", goal: "Debug a coding integration", domain: "coding", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
        { id: "goal-5", goal: "Ship a coding workflow", domain: "coding", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
      ],
      providerSmokes: {
        anthropic: "docs/live/provider-anthropic.md",
        openRouter: "docs/live/provider-openrouter.md",
        privateOaiCompat: "docs/live/provider-private.md",
      },
      internalCredentialSmoke: "docs/live/internal-api-smoke.md",
      worldSubscriptions: {
        canonical: "git@github.com:owner/world-final.git",
        privateFork: "git@github.com:team/world-private.git",
      },
      behaviorLoop: {
        antiPatternAvoided: "docs/live/anti-pattern-avoided.md",
        antiPatternUnfamiliarTerritory: "docs/live/anti-pattern-unfamiliar-territory.md",
        tracesRead: ["docs/live/trace-a.md", "docs/live/trace-b.md"],
        traceSimilarWorkflows: "docs/live/trace-similar-workflows.md",
        monitorFailurePattern: "docs/live/monitor-failure-pattern.md",
        recoverReplan: "docs/live/recover-replan.md",
        destructiveHold: "docs/live/destructive-hold.md",
        destructiveEscalation: "docs/live/destructive-escalation.md",
        destructiveConfirmation: "docs/live/destructive-confirmation.md",
        destructiveContinuation: "docs/live/destructive-continuation.md",
        destructiveEndpoint: {
          run: "runs/run-live-001/RUN.md",
          sequence: [
            { step: "hold", evidence: "docs/live/destructive-hold.md" },
            { step: "escalation", evidence: "docs/live/destructive-escalation.md" },
            { step: "confirmation", evidence: "docs/live/destructive-confirmation.md" },
            { step: "continuation", evidence: "docs/live/destructive-continuation.md" },
          ],
        },
        refusal: "docs/live/refusal.md",
      },
      dreamArtifacts: {
        skillCandidates: ["docs/live/skill-candidate-a.md", "docs/live/skill-candidate-b.md"],
        internalSkill: "proposals/skills/coding/internal/SKILL.md",
        internalSkillPrivateFork: "docs/live/internal-skill-private-fork.md",
        internalSkillCanonicalAbsence: "docs/live/internal-skill-canonical-absence.md",
        publicSkill: "proposals/skills/coding/public/SKILL.md",
        antiPattern: "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
        trace: "proposals/traces/coding/workflow/TRACE.md",
        traceSourceRun: "docs/live/dream-trace-source-run.md",
        traceAnnotations: "docs/live/dream-trace-annotations.md",
      },
      publicContribution: {
        contributorAgent: "live-agent",
        publicSkillPr: "https://github.com/owner/world-final/pull/1",
        mathGate: "docs/live/math-gate.md",
        contributorTrust: 0.5,
        autoMerge: "https://github.com/owner/world-final/actions/runs/1",
        canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
        positiveSignals: [
          { agent: "signal-agent-a", evidence: "docs/live/signal-1.md" },
          { agent: "signal-agent-b", evidence: "docs/live/signal-2.md" },
          { agent: "signal-agent-c", evidence: "docs/live/signal-3.md" },
          { agent: "signal-agent-d", evidence: "docs/live/signal-4.md" },
          { agent: "signal-agent-e", evidence: "docs/live/signal-5.md" },
        ],
        externalPullUses: [
          { agent: "external-agent-a", evidence: "docs/live/external-pull-1.md" },
          { agent: "external-agent-b", evidence: "docs/live/external-pull-2.md" },
          { agent: "external-agent-c", evidence: "docs/live/external-pull-3.md" },
        ],
      },
      publishedArtifacts: {
        contributorAgent: "live-agent",
        antiPattern: "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
        trace: "domains/coding/traces/workflow/TRACE.md",
        run: "runs/run-live-001/RUN.md",
        tracePlanRead: { agent: "plan-reader-a", evidence: "docs/live/trace-plan-read.md" },
        runPlanRead: { agent: "plan-reader-b", evidence: "docs/live/run-plan-read.md" },
      },
      curationStats: {
        featuredPick: "featured/current.md",
        featuredAntiPattern: "domains/coding/anti-patterns/provider-quirk/ANTI-PATTERN.md",
        agentContributor: "live-agent",
        featuredContributor: "provider-quirk-author",
        stats: "STATS.md",
        top5SkillSharePercent: 30,
      },
      twoWeekImprovement: {
        contributorAgent: "live-agent",
        followupDate: "2026-05-22",
        baselineMetric: 120,
        followupMetric: 90,
        improvementPercent: 25,
        contributorProfile: "contributors/live-agent.json",
        competingDiscussion: "https://github.com/owner/world-final/discussions/2",
        competingSkillReferences: [
          "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          "https://github.com/owner/world-final/blob/main/domains/coding/skills/public-variant/SKILL.md",
        ],
        similarGoalsEvidence: "docs/live/similar-goals.md",
        refinementEvidence: [
          { agent: "refinement-agent-a", evidence: "docs/live/refinement-1.md" },
          { agent: "refinement-agent-b", evidence: "docs/live/refinement-2.md" },
        ],
        contributorProfileSummary: {
          publicSkills: 1,
          antiPatterns: 1,
          traces: 1,
          publishedRuns: 1,
          internalSkills: 2,
          publicTrust: 0.61,
        },
      },
    })}\n`,
    "utf8",
  );

  return { subscriptionsPath, profilesPath, credentialsPath, evidencePath };
}

describe("doctorCommand", () => {
  test("keeps the default offline-local checks stable", () => {
    expect(doctorCommand()).toEqual({
      ok: true,
      checks: ["state:in-memory", "provider:local", "world:filesystem"],
    });
  });

  test("reports live readiness blockers with injected probes", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.remote:missing");
    expect(result.checks).toContain("world.remote:missing");
    expect(result.checks).toContain("provider.env:missing");
    expect(result.checks).toContain("github.env:missing");
    expect(result.checks).toContain("github.auth:invalid");
    expect(result.checks).toContain("docker:installed");
    expect(result.checks).toContain("docker.compose:missing");
    expect(result.checks).toContain("v1.evidencePath:missing");
  });

  test("returns next actions for failed live readiness checks", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: blockedRunner,
    });

    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "agent.name:missing",
        env: expect.arrayContaining(["VIVARIUM_AGENT_REPO_NAME"]),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "agent.remote:missing",
        command: expect.stringContaining('git -C "/agent" remote add origin'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "world.remote:missing",
        command: expect.stringContaining('git -C "/world" remote add origin'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "provider.openrouter:missing",
        env: expect.arrayContaining(["OPENROUTER_API_KEY"]),
        command: expect.stringContaining('bun "/agent/apps/cli/src/index.ts" providers configure'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "world.subscriptionsPath:missing",
        command: expect.stringContaining('bun "/agent/apps/cli/src/index.ts" world subscribe'),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "github.auth:invalid",
        command: expect.stringContaining("gh auth status"),
      }),
    );
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "v1.evidencePath:missing",
        env: expect.arrayContaining(["VIVARIUM_V1_EVIDENCE_PATH"]),
        guide: "docs/guides/live-readiness.md#v1-evidence-manifest",
      }),
    );
  });

  test("returns next-action guide anchors that exist in the live-readiness guide", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat" },
      runner: missingDockerRunner,
    });
    const anchors = markdownHeadingAnchors(readFileSync("docs/guides/live-readiness.md", "utf8"));

    for (const action of result.nextActions ?? []) {
      const [, anchor] = action.guide.split("#");
      if (anchor !== undefined) {
        expect(anchors.has(anchor), `${action.check} guide ${action.guide} should reference an existing heading`).toBe(true);
      }
    }
  });

  test("describes detailed v1 evidence requirements in next actions", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-next-actions-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(evidencePath, "{}\n", "utf8");
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { GH_PAGER: "cat", VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });
    const actions = new Map((result.nextActions ?? []).map((action) => [action.check, action.action]));

    expect(actions.get("v1.dreamArtifacts:missing")).toContain("internal and public skills");
    expect(actions.get("v1.dreamArtifacts:missing")).toContain("private fork only");
    expect(actions.get("v1.dreamArtifacts:missing")).toContain("distinct");
    expect(actions.get("v1.dreamArtifacts:missing")).toContain("distinct internal and public");
    expect(actions.get("v1.dreamArtifacts:missing")).toContain("instructive run");
    expect(actions.get("v1.dreamArtifacts:missing")).toContain("annotations");
    expect(actions.get("v1.publicContribution:missing")).toContain("math gate");
    expect(actions.get("v1.publicContribution:missing")).toContain("contributor trust");
    expect(actions.get("v1.publicContribution:missing")).toContain("contributor agent identity");
    expect(actions.get("v1.publicContribution:missing")).toContain("GitHub public skill PR URL");
    expect(actions.get("v1.publicContribution:missing")).toContain("GitHub Actions auto-merge run URL");
    expect(actions.get("v1.publicContribution:missing")).toContain("distinct");
    expect(actions.get("v1.publicContribution:missing")).toContain("agent/evidence");
    expect(actions.get("v1.publicContribution:missing")).toContain("other-agent");
    expect(actions.get("v1.curationStats:missing")).toContain("different contributor");
    expect(actions.get("v1.curationStats:missing")).toContain("anti-pattern");
    expect(actions.get("v1.curationStats:missing")).toContain("30%");
    expect(actions.get("v1.realGoals:missing")).toContain("distinct");
    expect(actions.get("v1.realGoals:missing")).toContain("named real coding goals");
    expect(actions.get("v1.starterPack:missing")).toContain("distinct installed");
    expect(actions.get("v1.providerSmokes:missing")).toContain("distinct");
    expect(actions.get("v1.behaviorLoop:missing")).toContain("unfamiliar territory");
    expect(actions.get("v1.behaviorLoop:missing")).toContain("similar workflows");
    expect(actions.get("v1.behaviorLoop:missing")).toContain("ordered destructive-endpoint run sequence");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("fourteen days");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("faster");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("similar goals");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("similar-goal comparison evidence");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("profile counts");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("contributor agent identity");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("GitHub Discussion URL");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("competing skill variant references");
    expect(actions.get("v1.twoWeekImprovement:missing")).toContain("other-agent refinement agent/evidence");
    expect(actions.get("v1.publishedArtifacts:missing")).toContain("trace and run Plan-read agent/evidence");
    expect(actions.get("v1.publishedArtifacts:missing")).toContain("contributor agent identity");
    expect(actions.get("v1.publishedArtifacts:missing")).toContain("other-agent");
  });

  test("reports placeholder repo names as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "the-agent",
        VIVARIUM_WORLD_REPO_NAME: "the-world",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.name:placeholder");
    expect(result.checks).toContain("world.name:placeholder");
  });

  test("reports unfilled angle-bracket template values as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "<final-agent-repo>",
        VIVARIUM_WORLD_REPO_NAME: "<final-world-repo>",
        VIVARIUM_GITHUB_OWNER: "<github-owner-or-org>",
        VIVARIUM_GITHUB_REPOSITORY_ID: "<world-repository-node-id>",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "<discussion-category-node-id>",
        VIVARIUM_CANONICAL_WORLD_REF: "<canonical-world-remote-url>",
        VIVARIUM_PRIVATE_WORLD_REF: "<private-world-remote-url>",
        ANTHROPIC_API_KEY: "<redacted-anthropic-key>",
        OPENROUTER_API_KEY: "<redacted-openrouter-key>",
        VIVARIUM_OAI_COMPAT_API_KEY: "<redacted-private-oai-compatible-key>",
        VIVARIUM_OAI_COMPAT_BASE_URL: "<private-oai-compatible-base-url>",
        VIVARIUM_OAI_COMPAT_MODEL: "<private-fine-tune-model>",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "<internal-api-health-url>",
        GITHUB_TOKEN: "<redacted-github-token>",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        "agent.name:placeholder",
        "world.name:placeholder",
        "world.canonicalRef:placeholder",
        "world.privateForkRef:placeholder",
        "provider.env:placeholder",
        "provider.anthropic:placeholder",
        "provider.openrouter:placeholder",
        "provider.privateOaiCompat:placeholder",
        "internalApi.healthUrl:placeholder",
        "github.env:placeholder",
        "github.owner:placeholder",
        "github.repositoryId:placeholder",
        "github.discussionCategoryId:placeholder",
        "v1.evidencePath:missing",
      ]),
    );
  });

  test("reports missing v1 loop evidence from an incomplete evidence manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-evidence-incomplete-"));
    const evidencePath = join(root, "v1-evidence.json");
    const starterSkillReferences = Array.from({ length: 20 }, (_, index) => `domains/coding/skills/starter-${index + 1}/SKILL.md`);
    const starterTraceReferences = Array.from({ length: 3 }, (_, index) => `domains/coding/traces/starter-${index + 1}/TRACE.md`);
    for (const path of [
      "domains/coding/curriculum.md",
      ...starterSkillReferences,
      ...starterTraceReferences,
      "docs/live/starter-run-1.md",
      "docs/live/starter-run-2.md",
    ]) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "starter evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        starterPack: {
          primaryDomain: "coding",
          skillCount: 20,
          traceCount: 3,
          curriculum: "domains/coding/curriculum.md",
          skillReferences: starterSkillReferences,
          traceReferences: starterTraceReferences,
          firstRunReferences: ["docs/live/starter-run-1.md", "docs/live/starter-run-2.md"],
        },
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.starterPack:configured");
    expect(result.checks).toContain("v1.realGoals:missing");
    expect(result.checks).toContain("v1.providerSmokes:missing");
    expect(result.checks).toContain("v1.publicContribution:missing");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 starter pack evidence to show first runs referenced it", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-starter-first-runs-"));
    const evidencePath = join(root, "v1-evidence.json");
    const curriculumPath = join(root, "domains/coding/curriculum.md");
    mkdirSync(dirname(curriculumPath), { recursive: true });
    writeFileSync(curriculumPath, "coding curriculum evidence\n", "utf8");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        starterPack: { primaryDomain: "coding", skillCount: 20, traceCount: 3, curriculum: "domains/coding/curriculum.md" },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.starterPack:missing");
  });

  test("requires v1 starter pack counts to cite installed skills and traces", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-starter-artifacts-"));
    const evidencePath = join(root, "v1-evidence.json");
    for (const path of ["domains/coding/curriculum.md", "docs/live/starter-run-1.md", "docs/live/starter-run-2.md"]) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "starter evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        starterPack: {
          primaryDomain: "coding",
          skillCount: 20,
          traceCount: 3,
          curriculum: "domains/coding/curriculum.md",
          firstRunReferences: ["docs/live/starter-run-1.md", "docs/live/starter-run-2.md"],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.starterPack:missing");
  });

  test("requires v1 real goals to use distinct goal IDs and run evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-distinct-real-goals-"));
    const evidencePath = join(root, "v1-evidence.json");
    const goalPath = join(root, "docs/live/goal.md");
    mkdirSync(dirname(goalPath), { recursive: true });
    writeFileSync(goalPath, "goal evidence\n", "utf8");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal.md" },
          { id: "goal-1", date: "2026-05-02", evidence: "docs/live/goal.md" },
          { id: "goal-1", date: "2026-05-04", evidence: "docs/live/goal.md" },
          { id: "goal-1", date: "2026-05-06", evidence: "docs/live/goal.md" },
          { id: "goal-1", date: "2026-05-08", evidence: "docs/live/goal.md" },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.realGoals:missing");
  });

  test("requires v1 real goals to be named coding goals", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-real-coding-goals-"));
    const evidencePath = join(root, "v1-evidence.json");
    for (const path of [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
    ]) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "real goal evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.realGoals:missing");
  });

  test("rejects v1 manifest sections that reference missing local evidence artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-evidence-links-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        starterPack: { primaryDomain: "coding", skillCount: 20, traceCount: 3, curriculum: "domains/coding/curriculum.md" },
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        providerSmokes: {
          anthropic: "docs/live/missing-provider-anthropic.md",
          openRouter: "https://github.com/owner/world/actions/runs/2",
          privateOaiCompat: "https://github.com/owner/world/actions/runs/3",
        },
        internalCredentialSmoke: "https://github.com/owner/world/actions/runs/4",
        worldSubscriptions: {
          canonical: "git@github.com:owner/world-final.git",
          privateFork: "git@github.com:team/world-private.git",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.providerSmokes:missing");
  });

  test("requires v1 provider smoke evidence to be distinct per provider", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-provider-smoke-distinct-"));
    const evidencePath = join(root, "v1-evidence.json");
    const providerSmokePath = join(root, "docs/live/provider-smoke.md");
    mkdirSync(dirname(providerSmokePath), { recursive: true });
    writeFileSync(providerSmokePath, "one combined smoke artifact\n", "utf8");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        providerSmokes: {
          anthropic: "docs/live/provider-smoke.md",
          openRouter: "docs/live/provider-smoke.md",
          privateOaiCompat: "docs/live/provider-smoke.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.providerSmokes:missing");
  });

  test("rejects opaque v1 evidence strings that are not URLs or local artifact paths", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-opaque-evidence-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        behaviorLoop: {
          antiPatternAvoided: "run-anti-pattern",
          tracesRead: ["trace-a", "trace-b"],
          recoverReplan: "run-recover",
          destructiveHold: "run-destructive-hold",
          refusal: "run-refusal",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
  });

  test("requires counted v1 evidence arrays to reference distinct artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-distinct-evidence-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/curriculum.md",
      "docs/live/starter-run.md",
      "docs/live/anti-pattern-avoided.md",
      "docs/live/trace-a.md",
      "docs/live/monitor-failure-pattern.md",
      "docs/live/recover-replan.md",
      "docs/live/destructive-hold.md",
      "docs/live/destructive-escalation.md",
      "docs/live/destructive-confirmation.md",
      "docs/live/destructive-continuation.md",
      "docs/live/refusal.md",
      "docs/live/skill-candidate.md",
      "proposals/skills/coding/internal/SKILL.md",
      "proposals/skills/coding/public/SKILL.md",
      "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
      "proposals/traces/coding/workflow/TRACE.md",
      "docs/live/math-gate.md",
      "domains/coding/skills/public/SKILL.md",
      "docs/live/signal.md",
      "docs/live/external-pull.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "v1 evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        starterPack: {
          primaryDomain: "coding",
          skillCount: 20,
          traceCount: 3,
          curriculum: "domains/coding/curriculum.md",
          firstRunReferences: ["docs/live/starter-run.md", "docs/live/starter-run.md"],
        },
        behaviorLoop: {
          antiPatternAvoided: "docs/live/anti-pattern-avoided.md",
          tracesRead: ["docs/live/trace-a.md", "docs/live/trace-a.md"],
          monitorFailurePattern: "docs/live/monitor-failure-pattern.md",
          recoverReplan: "docs/live/recover-replan.md",
          destructiveHold: "docs/live/destructive-hold.md",
          destructiveEscalation: "docs/live/destructive-escalation.md",
          destructiveConfirmation: "docs/live/destructive-confirmation.md",
          destructiveContinuation: "docs/live/destructive-continuation.md",
          refusal: "docs/live/refusal.md",
        },
        dreamArtifacts: {
          skillCandidates: ["docs/live/skill-candidate.md", "docs/live/skill-candidate.md"],
          internalSkill: "proposals/skills/coding/internal/SKILL.md",
          publicSkill: "proposals/skills/coding/public/SKILL.md",
          antiPattern: "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
          trace: "proposals/traces/coding/workflow/TRACE.md",
        },
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          mathGate: "docs/live/math-gate.md",
          contributorTrust: 0.5,
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "signal-agent-a", evidence: "docs/live/signal.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal.md" },
          ],
          externalPullUses: [
            { agent: "external-agent-a", evidence: "docs/live/external-pull.md" },
            { agent: "external-agent-a", evidence: "docs/live/external-pull.md" },
            { agent: "external-agent-a", evidence: "docs/live/external-pull.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.starterPack:missing");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
    expect(result.checks).toContain("v1.dreamArtifacts:missing");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 behavior loop evidence to include monitor tool-failure detection", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-monitor-failure-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/anti-pattern-avoided.md",
      "docs/live/trace-a.md",
      "docs/live/trace-b.md",
      "docs/live/recover-replan.md",
      "docs/live/destructive-hold.md",
      "docs/live/refusal.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "behavior evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        behaviorLoop: {
          antiPatternAvoided: "docs/live/anti-pattern-avoided.md",
          tracesRead: ["docs/live/trace-a.md", "docs/live/trace-b.md"],
          recoverReplan: "docs/live/recover-replan.md",
          destructiveHold: "docs/live/destructive-hold.md",
          refusal: "docs/live/refusal.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
  });

  test("requires v1 behavior loop evidence for unfamiliar anti-pattern lookup and similar workflow traces", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-behavior-loop-context-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/anti-pattern-avoided.md",
      "docs/live/trace-a.md",
      "docs/live/trace-b.md",
      "docs/live/monitor-failure-pattern.md",
      "docs/live/recover-replan.md",
      "docs/live/destructive-hold.md",
      "docs/live/destructive-escalation.md",
      "docs/live/destructive-confirmation.md",
      "docs/live/destructive-continuation.md",
      "docs/live/refusal.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "behavior evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        behaviorLoop: {
          antiPatternAvoided: "docs/live/anti-pattern-avoided.md",
          tracesRead: ["docs/live/trace-a.md", "docs/live/trace-b.md"],
          monitorFailurePattern: "docs/live/monitor-failure-pattern.md",
          recoverReplan: "docs/live/recover-replan.md",
          destructiveHold: "docs/live/destructive-hold.md",
          destructiveEscalation: "docs/live/destructive-escalation.md",
          destructiveConfirmation: "docs/live/destructive-confirmation.md",
          destructiveContinuation: "docs/live/destructive-continuation.md",
          refusal: "docs/live/refusal.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
  });

  test("requires v1 dream trace evidence to include source run and annotations", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-dream-trace-source-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/skill-candidate-a.md",
      "docs/live/skill-candidate-b.md",
      "proposals/skills/coding/internal/SKILL.md",
      "proposals/skills/coding/public/SKILL.md",
      "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
      "proposals/traces/coding/workflow/TRACE.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "dream evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        dreamArtifacts: {
          skillCandidates: ["docs/live/skill-candidate-a.md", "docs/live/skill-candidate-b.md"],
          internalSkill: "proposals/skills/coding/internal/SKILL.md",
          publicSkill: "proposals/skills/coding/public/SKILL.md",
          antiPattern: "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
          trace: "proposals/traces/coding/workflow/TRACE.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.dreamArtifacts:missing");
  });

  test("requires v1 dream internal skill evidence to be private-fork only", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-dream-internal-private-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/skill-candidate-a.md",
      "docs/live/skill-candidate-b.md",
      "proposals/skills/coding/internal/SKILL.md",
      "proposals/skills/coding/public/SKILL.md",
      "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
      "proposals/traces/coding/workflow/TRACE.md",
      "docs/live/dream-trace-source-run.md",
      "docs/live/dream-trace-annotations.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "dream evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        dreamArtifacts: {
          skillCandidates: ["docs/live/skill-candidate-a.md", "docs/live/skill-candidate-b.md"],
          internalSkill: "proposals/skills/coding/internal/SKILL.md",
          publicSkill: "proposals/skills/coding/public/SKILL.md",
          antiPattern: "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
          trace: "proposals/traces/coding/workflow/TRACE.md",
          traceSourceRun: "docs/live/dream-trace-source-run.md",
          traceAnnotations: "docs/live/dream-trace-annotations.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.dreamArtifacts:missing");
  });

  test("requires v1 dream internal and public skill evidence to be distinct", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-dream-skill-distinct-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/skill-candidate-a.md",
      "docs/live/skill-candidate-b.md",
      "proposals/skills/coding/shared/SKILL.md",
      "docs/live/internal-skill-private-fork.md",
      "docs/live/internal-skill-canonical-absence.md",
      "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
      "proposals/traces/coding/workflow/TRACE.md",
      "docs/live/dream-trace-source-run.md",
      "docs/live/dream-trace-annotations.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "dream evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        dreamArtifacts: {
          skillCandidates: ["docs/live/skill-candidate-a.md", "docs/live/skill-candidate-b.md"],
          internalSkill: "proposals/skills/coding/shared/SKILL.md",
          internalSkillPrivateFork: "docs/live/internal-skill-private-fork.md",
          internalSkillCanonicalAbsence: "docs/live/internal-skill-canonical-absence.md",
          publicSkill: "proposals/skills/coding/shared/SKILL.md",
          antiPattern: "proposals/anti-patterns/coding/failure/ANTI-PATTERN.md",
          trace: "proposals/traces/coding/workflow/TRACE.md",
          traceSourceRun: "docs/live/dream-trace-source-run.md",
          traceAnnotations: "docs/live/dream-trace-annotations.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.dreamArtifacts:missing");
  });

  test("requires v1 destructive endpoint evidence to include escalation confirmation and continuation", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-destructive-confirmation-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/anti-pattern-avoided.md",
      "docs/live/trace-a.md",
      "docs/live/trace-b.md",
      "docs/live/monitor-failure-pattern.md",
      "docs/live/recover-replan.md",
      "docs/live/destructive-hold.md",
      "docs/live/refusal.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "behavior evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        behaviorLoop: {
          antiPatternAvoided: "docs/live/anti-pattern-avoided.md",
          tracesRead: ["docs/live/trace-a.md", "docs/live/trace-b.md"],
          monitorFailurePattern: "docs/live/monitor-failure-pattern.md",
          recoverReplan: "docs/live/recover-replan.md",
          destructiveHold: "docs/live/destructive-hold.md",
          refusal: "docs/live/refusal.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
  });

  test("requires v1 destructive endpoint evidence to hold escalate confirm and continue in order", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-destructive-sequence-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      behaviorLoop: {
        destructiveEndpoint?: {
          run: string;
          sequence: { step: string; evidence: string }[];
        };
      };
    };
    manifest.behaviorLoop.destructiveEndpoint = {
      run: "runs/run-live-001/RUN.md",
      sequence: [
        { step: "hold", evidence: "docs/live/destructive-hold.md" },
        { step: "confirmation", evidence: "docs/live/destructive-confirmation.md" },
        { step: "escalation", evidence: "docs/live/destructive-escalation.md" },
        { step: "continuation", evidence: "docs/live/destructive-continuation.md" },
      ],
    };
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.behaviorLoop:missing");
  });

  test("requires v1 world subscriptions to name distinct inspectable refs", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-world-subscription-evidence-"));
    const evidencePath = join(root, "v1-evidence.json");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        worldSubscriptions: {
          canonical: "yes",
          privateFork: "yes",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.worldSubscriptions:missing");
  });

  test("rejects public contribution counts without inspectable signal and pull evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-evidence-"));
    const evidencePath = join(root, "v1-evidence.json");
    const canonicalSkill = join(root, "domains/coding/skills/public/SKILL.md");
    mkdirSync(dirname(canonicalSkill), { recursive: true });
    writeFileSync(canonicalSkill, "canonical skill evidence\n", "utf8");
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: 5,
          externalPulls: 3,
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 public contribution PR, auto-merge, and canonical landing to be remote GitHub evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-remote-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/skills/public/SKILL.md",
      "docs/live/public-skill-pr.md",
      "docs/live/math-gate.md",
      "docs/live/auto-merge.md",
      "docs/live/signal-1.md",
      "docs/live/signal-2.md",
      "docs/live/signal-3.md",
      "docs/live/signal-4.md",
      "docs/live/signal-5.md",
      "docs/live/external-pull-1.md",
      "docs/live/external-pull-2.md",
      "docs/live/external-pull-3.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "public contribution remote evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "docs/live/public-skill-pr.md",
          mathGate: "docs/live/math-gate.md",
          contributorTrust: 0.5,
          autoMerge: "docs/live/auto-merge.md",
          canonicalSkill: "domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "signal-agent-a", evidence: "docs/live/signal-1.md" },
            { agent: "signal-agent-b", evidence: "docs/live/signal-2.md" },
            { agent: "signal-agent-c", evidence: "docs/live/signal-3.md" },
            { agent: "signal-agent-d", evidence: "docs/live/signal-4.md" },
            { agent: "signal-agent-e", evidence: "docs/live/signal-5.md" },
          ],
          externalPullUses: [
            { agent: "external-agent-a", evidence: "docs/live/external-pull-1.md" },
            { agent: "external-agent-b", evidence: "docs/live/external-pull-2.md" },
            { agent: "external-agent-c", evidence: "docs/live/external-pull-3.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 public contribution pull/use evidence from distinct other agents", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-other-agents-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/skills/public/SKILL.md",
      "docs/live/math-gate.md",
      "docs/live/signal-1.md",
      "docs/live/signal-2.md",
      "docs/live/signal-3.md",
      "docs/live/signal-4.md",
      "docs/live/signal-5.md",
      "docs/live/external-pull-1.md",
      "docs/live/external-pull-2.md",
      "docs/live/external-pull-3.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "public contribution evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          mathGate: "docs/live/math-gate.md",
          contributorTrust: 0.5,
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "signal-agent-a", evidence: "docs/live/signal-1.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-2.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-3.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-4.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-5.md" },
          ],
          externalPullUses: [
            { agent: "external-agent-a", evidence: "docs/live/external-pull-1.md" },
            { agent: "external-agent-a", evidence: "docs/live/external-pull-2.md" },
            { agent: "external-agent-a", evidence: "docs/live/external-pull-3.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 public contribution positive signals from distinct agents", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-positive-agents-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/skills/public/SKILL.md",
      "docs/live/math-gate.md",
      "docs/live/signal-1.md",
      "docs/live/signal-2.md",
      "docs/live/signal-3.md",
      "docs/live/signal-4.md",
      "docs/live/signal-5.md",
      "docs/live/external-pull-1.md",
      "docs/live/external-pull-2.md",
      "docs/live/external-pull-3.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "public contribution evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          mathGate: "docs/live/math-gate.md",
          contributorTrust: 0.5,
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "signal-agent-a", evidence: "docs/live/signal-1.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-2.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-3.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-4.md" },
            { agent: "signal-agent-a", evidence: "docs/live/signal-5.md" },
          ],
          externalPullUses: [
            { agent: "external-agent-a", evidence: "docs/live/external-pull-1.md" },
            { agent: "external-agent-b", evidence: "docs/live/external-pull-2.md" },
            { agent: "external-agent-c", evidence: "docs/live/external-pull-3.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 public contribution signal and pull/use agents to be other than the contributor", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-other-users-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/math-gate.md",
      "docs/live/signal-1.md",
      "docs/live/signal-2.md",
      "docs/live/signal-3.md",
      "docs/live/signal-4.md",
      "docs/live/signal-5.md",
      "docs/live/external-pull-1.md",
      "docs/live/external-pull-2.md",
      "docs/live/external-pull-3.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "public contribution other users evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          mathGate: "docs/live/math-gate.md",
          contributorTrust: 0.5,
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "live-agent", evidence: "docs/live/signal-1.md" },
            { agent: "signal-agent-b", evidence: "docs/live/signal-2.md" },
            { agent: "signal-agent-c", evidence: "docs/live/signal-3.md" },
            { agent: "signal-agent-d", evidence: "docs/live/signal-4.md" },
            { agent: "signal-agent-e", evidence: "docs/live/signal-5.md" },
          ],
          externalPullUses: [
            { agent: "live-agent", evidence: "docs/live/external-pull-1.md" },
            { agent: "external-agent-b", evidence: "docs/live/external-pull-2.md" },
            { agent: "external-agent-c", evidence: "docs/live/external-pull-3.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 public contribution math gate evidence and neutral trust", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-public-contribution-gate-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/skills/public/SKILL.md",
      "docs/live/signal-1.md",
      "docs/live/signal-2.md",
      "docs/live/signal-3.md",
      "docs/live/signal-4.md",
      "docs/live/signal-5.md",
      "docs/live/external-pull-1.md",
      "docs/live/external-pull-2.md",
      "docs/live/external-pull-3.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "public contribution evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publicContribution: {
          contributorAgent: "live-agent",
          publicSkillPr: "https://github.com/owner/world-final/pull/1",
          autoMerge: "https://github.com/owner/world-final/actions/runs/1",
          canonicalSkill: "https://github.com/owner/world-final/blob/main/domains/coding/skills/public/SKILL.md",
          positiveSignals: [
            { agent: "signal-agent-a", evidence: "docs/live/signal-1.md" },
            { agent: "signal-agent-b", evidence: "docs/live/signal-2.md" },
            { agent: "signal-agent-c", evidence: "docs/live/signal-3.md" },
            { agent: "signal-agent-d", evidence: "docs/live/signal-4.md" },
            { agent: "signal-agent-e", evidence: "docs/live/signal-5.md" },
          ],
          externalPullUses: [
            { agent: "external-agent-a", evidence: "docs/live/external-pull-1.md" },
            { agent: "external-agent-b", evidence: "docs/live/external-pull-2.md" },
            { agent: "external-agent-c", evidence: "docs/live/external-pull-3.md" },
          ],
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
  });

  test("requires v1 published trace and run to be read during another agent plan", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-published-plan-read-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
      "domains/coding/traces/workflow/TRACE.md",
      "runs/run-live-001/RUN.md",
      "docs/live/second-install-read.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "published artifact evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publishedArtifacts: {
          contributorAgent: "live-agent",
          antiPattern: "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
          trace: "domains/coding/traces/workflow/TRACE.md",
          run: "runs/run-live-001/RUN.md",
          secondInstallRead: "docs/live/second-install-read.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publishedArtifacts:missing");
    expect(result.nextActions).toContainEqual(
      expect.objectContaining({
        check: "v1.publishedArtifacts:missing",
        action: expect.stringContaining("trace and run Plan-read agent/evidence"),
      }),
    );
  });

  test("requires v1 published trace and run Plan-read evidence to be distinct", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-published-plan-read-distinct-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
      "domains/coding/traces/workflow/TRACE.md",
      "runs/run-live-001/RUN.md",
      "docs/live/plan-read.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "published artifact evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publishedArtifacts: {
          contributorAgent: "live-agent",
          antiPattern: "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
          trace: "domains/coding/traces/workflow/TRACE.md",
          run: "runs/run-live-001/RUN.md",
          tracePlanRead: "docs/live/plan-read.md",
          runPlanRead: "docs/live/plan-read.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publishedArtifacts:missing");
  });

  test("requires v1 published trace and run Plan-read evidence to name other agents", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-published-plan-read-agents-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
      "domains/coding/traces/workflow/TRACE.md",
      "runs/run-live-001/RUN.md",
      "docs/live/trace-plan-read.md",
      "docs/live/run-plan-read.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "published artifact evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publishedArtifacts: {
          contributorAgent: "live-agent",
          antiPattern: "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
          trace: "domains/coding/traces/workflow/TRACE.md",
          run: "runs/run-live-001/RUN.md",
          tracePlanRead: "docs/live/trace-plan-read.md",
          runPlanRead: "docs/live/run-plan-read.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publishedArtifacts:missing");
  });

  test("requires v1 published trace and run Plan-read agents to differ from the contributor", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-published-plan-read-other-contributor-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
      "domains/coding/traces/workflow/TRACE.md",
      "runs/run-live-001/RUN.md",
      "docs/live/trace-plan-read.md",
      "docs/live/run-plan-read.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "published artifact contributor evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        publishedArtifacts: {
          contributorAgent: "live-agent",
          antiPattern: "domains/coding/anti-patterns/failure/ANTI-PATTERN.md",
          trace: "domains/coding/traces/workflow/TRACE.md",
          run: "runs/run-live-001/RUN.md",
          tracePlanRead: { agent: "live-agent", evidence: "docs/live/trace-plan-read.md" },
          runPlanRead: { agent: "plan-reader-b", evidence: "docs/live/run-plan-read.md" },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publishedArtifacts:missing");
  });

  test("requires v1 curation stats to show the roadmap top-five contributor concentration", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-curation-stats-"));
    const evidencePath = join(root, "v1-evidence.json");
    for (const path of ["featured/current.md", "STATS.md"]) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "curation stats evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        curationStats: {
          featuredPick: "featured/current.md",
          stats: "STATS.md",
          top5SkillSharePercent: 1,
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.curationStats:missing");
  });

  test("requires v1 curation stats to feature a different contributor anti-pattern", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-curation-featured-anti-pattern-"));
    const evidencePath = join(root, "v1-evidence.json");
    for (const path of ["featured/current.md", "STATS.md"]) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "curation stats evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        curationStats: {
          featuredPick: "featured/current.md",
          stats: "STATS.md",
          top5SkillSharePercent: 30,
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.curationStats:missing");
  });

  test("requires v1 two-week evidence to include contributor profile counts and trust", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-profile-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/refinement-evidence.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          refinementEvidence: "docs/live/refinement-evidence.md",
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week competing variant evidence to be a GitHub Discussion URL", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-discussion-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/competing-discussion.md",
      "docs/live/refinement-evidence.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week discussion evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "docs/live/competing-discussion.md",
          refinementEvidence: "docs/live/refinement-evidence.md",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week evidence to cite both live competing skill variants", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-variants-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/refinement-evidence.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week competing variants evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          refinementEvidence: "docs/live/refinement-evidence.md",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week metrics to show follow-up is faster than baseline", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-faster-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/refinement-evidence.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week faster evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 90,
          followupMetric: 120,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          refinementEvidence: "docs/live/refinement-evidence.md",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week improvement to compare similar goals", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-similar-goals-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/refinement-evidence.md",
      "domains/coding/skills/public/SKILL.md",
      "domains/coding/skills/public-variant/SKILL.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week similar goals evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          competingSkillReferences: ["domains/coding/skills/public/SKILL.md", "domains/coding/skills/public-variant/SKILL.md"],
          refinementEvidence: "docs/live/refinement-evidence.md",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week refinement evidence to name other agents", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-refinement-agents-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
      "docs/live/similar-goals.md",
      "docs/live/refinement-evidence.md",
      "domains/coding/skills/public/SKILL.md",
      "domains/coding/skills/public-variant/SKILL.md",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week refinement agents evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          competingSkillReferences: ["domains/coding/skills/public/SKILL.md", "domains/coding/skills/public-variant/SKILL.md"],
          similarGoalsEvidence: "docs/live/similar-goals.md",
          refinementEvidence: "docs/live/refinement-evidence.md",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week improvement to cite other-agent refinement evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-refinement-"));
    const evidencePath = join(root, "v1-evidence.json");
    const localEvidencePaths = [
      "docs/live/goal-1.md",
      "docs/live/goal-2.md",
      "docs/live/goal-3.md",
      "docs/live/goal-4.md",
      "docs/live/goal-5.md",
      "contributors/live-agent.json",
    ];
    for (const path of localEvidencePaths) {
      const absolutePath = join(root, path);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "two-week refinement evidence\n", "utf8");
    }
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        realGoals: [
          { id: "goal-1", date: "2026-05-01", evidence: "docs/live/goal-1.md" },
          { id: "goal-2", date: "2026-05-02", evidence: "docs/live/goal-2.md" },
          { id: "goal-3", date: "2026-05-04", evidence: "docs/live/goal-3.md" },
          { id: "goal-4", date: "2026-05-06", evidence: "docs/live/goal-4.md" },
          { id: "goal-5", date: "2026-05-08", evidence: "docs/live/goal-5.md" },
        ],
        twoWeekImprovement: {
          followupDate: "2026-05-22",
          baselineMetric: 120,
          followupMetric: 90,
          improvementPercent: 25,
          contributorProfile: "contributors/live-agent.json",
          competingDiscussion: "https://github.com/owner/world-final/discussions/2",
          contributorProfileSummary: {
            publicSkills: 1,
            antiPatterns: 1,
            traces: 1,
            publishedRuns: 1,
            internalSkills: 2,
            publicTrust: 0.61,
          },
        },
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week refinement agents to differ from the contributor", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-two-week-refinement-contributor-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      twoWeekImprovement: {
        contributorAgent?: string;
        refinementEvidence: { agent: string; evidence: string }[];
      };
    };
    manifest.twoWeekImprovement.contributorAgent = "live-agent";
    manifest.twoWeekImprovement.refinementEvidence = [
      { agent: "live-agent", evidence: "docs/live/refinement-1.md" },
      { agent: "refinement-agent-b", evidence: "docs/live/refinement-2.md" },
    ];
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: { VIVARIUM_V1_EVIDENCE_PATH: evidencePath },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 GitHub evidence URLs to target the configured canonical world repo", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-canonical-github-urls-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      publicContribution: {
        publicSkillPr: string;
        autoMerge: string;
        canonicalSkill: string;
      };
      twoWeekImprovement: {
        competingDiscussion: string;
      };
    };
    manifest.publicContribution.publicSkillPr = "https://github.com/other/wrong-world/pull/1";
    manifest.publicContribution.autoMerge = "https://github.com/other/wrong-world/actions/runs/1";
    manifest.publicContribution.canonicalSkill = "https://github.com/other/wrong-world/blob/main/domains/coding/skills/public/SKILL.md";
    manifest.twoWeekImprovement.competingDiscussion = "https://github.com/other/wrong-world/discussions/2";
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_V1_EVIDENCE_PATH: evidencePath,
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.publicContribution:missing");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week competing skill references to target the configured canonical world repo", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-canonical-competing-skills-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      twoWeekImprovement: {
        competingSkillReferences: string[];
      };
    };
    manifest.twoWeekImprovement.competingSkillReferences = [
      "domains/coding/skills/public/SKILL.md",
      "domains/coding/skills/public-variant/SKILL.md",
    ];
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_V1_EVIDENCE_PATH: evidencePath,
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("requires v1 two-week competing skill references to include the landed public skill", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-competing-includes-public-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      twoWeekImprovement: {
        competingSkillReferences: string[];
      };
    };
    manifest.twoWeekImprovement.competingSkillReferences = [
      "https://github.com/owner/world-final/blob/main/domains/coding/skills/public-variant/SKILL.md",
      "https://github.com/owner/world-final/blob/main/domains/coding/skills/third-variant/SKILL.md",
    ];
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_V1_EVIDENCE_PATH: evidencePath,
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("rejects future-dated v1 real goals and follow-up evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-v1-future-dates-"));
    const { evidencePath } = writeLiveReadyFiles(root);
    const manifest = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      realGoals: Array<{ date: string }>;
      twoWeekImprovement: {
        followupDate: string;
      };
    };
    manifest.realGoals = [
      { ...manifest.realGoals[0], date: "2026-06-01" },
      { ...manifest.realGoals[1], date: "2026-06-02" },
      { ...manifest.realGoals[2], date: "2026-06-04" },
      { ...manifest.realGoals[3], date: "2026-06-06" },
      { ...manifest.realGoals[4], date: "2026-06-08" },
    ];
    manifest.twoWeekImprovement.followupDate = "2026-06-22";
    writeFileSync(evidencePath, `${JSON.stringify(manifest)}\n`, "utf8");

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      nowMillis: Date.parse("2026-05-10T00:00:00.000Z"),
      env: {
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_V1_EVIDENCE_PATH: evidencePath,
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("v1.evidencePath:configured");
    expect(result.checks).toContain("v1.realGoals:missing");
    expect(result.checks).toContain("v1.twoWeekImprovement:missing");
  });

  test("reports missing GitHub target metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("github.owner:missing");
    expect(result.checks).toContain("github.repositoryId:missing");
    expect(result.checks).toContain("github.discussionCategoryId:missing");
  });

  test("reports missing v1 provider targets as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.anthropic:missing");
    expect(result.checks).toContain("provider.openrouter:configured");
    expect(result.checks).toContain("provider.privateOaiCompat:missing");
  });

  test("reports missing internal API credential metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("credentials.path:missing");
    expect(result.checks).toContain("internalApi.credentialName:missing");
    expect(result.checks).toContain("internalApi.healthUrl:missing");
  });

  test("reports missing canonical and private world subscription metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:missing");
    expect(result.checks).toContain("world.canonicalRef:missing");
    expect(result.checks).toContain("world.privateForkRef:missing");
  });

  test("reports missing provider profile metadata as live readiness blockers", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: "/tmp/vivarium-world-subscriptions.json",
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.profilesPath:missing");
    expect(result.checks).toContain("provider.anthropicProfile:missing");
    expect(result.checks).toContain("provider.openrouterProfile:missing");
    expect(result.checks).toContain("provider.privateOaiCompatProfile:missing");
  });

  test("reports configured but missing readiness files as unavailable", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-readiness-files-"));
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: join(root, "world-subscriptions.json"),
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_PROVIDER_PROFILES_PATH: join(root, "provider-profiles.json"),
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
        VIVARIUM_CREDENTIALS_PATH: join(root, "credentials.enc"),
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:unavailable");
    expect(result.checks).toContain("provider.profilesPath:unavailable");
    expect(result.checks).toContain("credentials.path:unavailable");
  });

  test("reports configured provider profile names missing from the profiles file", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-provider-profiles-"));
    const profilesPath = join(root, "provider-profiles.json");
    writeFileSync(
      profilesPath,
      `${JSON.stringify({
        profiles: [
          {
            name: "unrelated",
            kind: "openai-compat",
            apiKeyEnv: "OPENROUTER_API_KEY",
            model: "openrouter/test-model",
            capabilities: ["chat"],
            contextWindow: 128000,
            costClass: "medium",
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: "/tmp/vivarium-world-subscriptions.json",
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_PROVIDER_PROFILES_PATH: profilesPath,
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
        VIVARIUM_CREDENTIALS_PATH: "/tmp/vivarium-credentials.enc",
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("provider.profilesPath:configured");
    expect(result.checks).toContain("provider.anthropicProfile:unavailable");
    expect(result.checks).toContain("provider.openrouterProfile:unavailable");
    expect(result.checks).toContain("provider.privateOaiCompatProfile:unavailable");
  });

  test("reports configured world refs missing from the subscriptions file", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-world-subscriptions-"));
    const subscriptionsPath = join(root, "world-subscriptions.json");
    writeFileSync(
      subscriptionsPath,
      `${JSON.stringify({
        worlds: [
          {
            label: "unrelated",
            root: "/tmp/unrelated-world",
            priority: 0,
            ref: "git@github.com:owner/unrelated-world.git",
            autoPushEnabled: false,
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: subscriptionsPath,
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: blockedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("world.subscriptionsPath:configured");
    expect(result.checks).toContain("world.canonicalRef:unavailable");
    expect(result.checks).toContain("world.privateForkRef:unavailable");
  });

  test("reports remotes that do not match configured owner and repo names", () => {
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        OPENROUTER_API_KEY: "configured",
        GITHUB_TOKEN: "configured",
      },
      runner: mismatchedRemoteRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContain("agent.remote:mismatch");
    expect(result.checks).toContain("world.remote:mismatch");
  });

  test("accepts a complete v1 evidence manifest with otherwise configured live readiness inputs", () => {
    const root = mkdtempSync(join(tmpdir(), "vivarium-doctor-live-ready-"));
    const files = writeLiveReadyFiles(root);
    const result = doctorCommand({
      mode: "live-readiness",
      agentRoot: "/agent",
      worldRoot: "/world",
      nowMillis: Date.parse("2026-05-23T00:00:00.000Z"),
      env: {
        VIVARIUM_AGENT_REPO_NAME: "agent-final",
        VIVARIUM_WORLD_REPO_NAME: "world-final",
        VIVARIUM_GITHUB_OWNER: "owner",
        VIVARIUM_GITHUB_REPOSITORY_ID: "R_1",
        VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID: "DIC_1",
        VIVARIUM_WORLD_SUBSCRIPTIONS_PATH: files.subscriptionsPath,
        VIVARIUM_CANONICAL_WORLD_REF: "git@github.com:owner/world-final.git",
        VIVARIUM_PRIVATE_WORLD_REF: "git@github.com:team/world-private.git",
        ANTHROPIC_API_KEY: "configured",
        OPENROUTER_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_API_KEY: "configured",
        VIVARIUM_OAI_COMPAT_BASE_URL: "https://models.internal.example/v1",
        VIVARIUM_OAI_COMPAT_MODEL: "fine-tune",
        VIVARIUM_PROVIDER_PROFILES_PATH: files.profilesPath,
        VIVARIUM_ANTHROPIC_PROVIDER_PROFILE: "anthropic-main",
        VIVARIUM_OPENROUTER_PROVIDER_PROFILE: "openrouter",
        VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE: "private-finetune",
        VIVARIUM_CREDENTIALS_PATH: files.credentialsPath,
        VIVARIUM_INTERNAL_API_CREDENTIAL_NAME: "INTERNAL_API_TOKEN",
        VIVARIUM_INTERNAL_API_HEALTH_URL: "https://internal.example/health",
        VIVARIUM_V1_EVIDENCE_PATH: files.evidencePath,
        GITHUB_TOKEN: "configured",
      },
      runner: readyRunner,
    });

    expect(result.ok).toBe(true);
    expect(result.nextActions).toEqual([]);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        "v1.evidencePath:configured",
        "v1.starterPack:configured",
        "v1.realGoals:configured",
        "v1.providerSmokes:configured",
        "v1.internalCredentialSmoke:configured",
        "v1.worldSubscriptions:configured",
        "v1.behaviorLoop:configured",
        "v1.dreamArtifacts:configured",
        "v1.publicContribution:configured",
        "v1.publishedArtifacts:configured",
        "v1.curationStats:configured",
        "v1.twoWeekImprovement:configured",
      ]),
    );
  });
});
