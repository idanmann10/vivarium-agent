import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const selfToolDocs = [
  "memory",
  "skills",
  "anti-patterns",
  "traces",
  "runs",
  "episodes",
  "world",
  "curriculum",
  "identity",
  "attention",
  "confidence",
  "publishables",
] as const;

const documentedMethods = {
  curriculum: ["read(domain)", "progress(domain)", "advance(domain, stepIndex)"],
  identity: ["summary()", "stage(domain)", "history(limit?)"],
  attention: ["focus(request)", "defocus()", "status()"],
  episodes: ["note(request)", "surprise(request)", "recallRun(runId)"],
} as const;

const referenceFormatFields = {
  "anti-pattern-format": [
    "AntiPattern",
    "why",
    "insteadDo",
    "relatedSkills",
    "AntiPatternCandidateProposal",
  ],
  "curriculum-format": [
    "Curriculum",
    "CurriculumStep",
    "references",
    "starterGoals",
    "CurriculumProgress",
  ],
  "episode-kinds": ["Episode", "BaseEpisode", "run_start", "surprise", "validation", "Reflection"],
  "run-format": ["Run", "agentId", "publishable", "publishedAt", "visibility"],
  "skill-format": ["Skill", "SkillStatus", "requiredCredentials", "requiredToolsets", "habitual"],
  "trace-format": ["Trace", "TraceStep", "prerequisites", "pitfalls", "TraceCandidateProposal"],
} as const;

const architectureDocs = {
  packages: [
    "apps/cli",
    "apps/daemon",
    "packages/core",
    "packages/state",
    "packages/runtime",
    "packages/tools",
    "packages/providers",
    "packages/world",
    "packages/eval",
  ],
  "data-flow": [
    "Plan",
    "Predict",
    "Execute",
    "Monitor",
    "Recover",
    "Validate",
    "Reflect",
    "Dream",
    "world proposal",
  ],
} as const;

const mathDocs = {
  "wilson-score": ["Wilson", "helped", "uses", "z = 1.96", "0.4385"],
  trust: ["sigmoid", "log1p", "effective_LB", "0.85", "0.15"],
  "retrieval-scoring": ["alpha", "beta", "gamma", "delta", "recencyScore", "tauDays = 30"],
  "surprise-magnitude": ["cosineSimilarity", "surpriseMagnitude", "shouldTagSurprise", "0.3"],
  stages: ["developmentScore", "runsCompleted", "successRate", "skillDiversity", "master"],
  diversity: ["chooseWithEpsilon", "epsilon = 0.05", "alternatives", "non-habitual"],
} as const;

const conceptDocs = {
  "anti-patterns": ["why", "insteadDo", "relatedSkills", "evidenceRunIds", "regression"],
  credentials: ["encrypted", "apiKeyEnvVar", "oauth", "service_account", "smoke"],
  domains: ["coding", "writing", "research", "curriculum", "stage"],
  eval: ["compounding", "before", "after", "Dream", "benchmark"],
  kernel: ["KERNEL", "search", "prediction", "reflection", "refusal"],
  memory: ["working memory", "episodic", "semantic", "procedural", "identity"],
  primitives: ["Plan", "Predict", "Execute", "Monitor", "Recover", "Validate", "Reflect", "Dream"],
  safety: ["allowlist", "rate limits", "argument scrubbing", "computer-use", "refusal"],
  tools: ["dispatcher", "SelfTools", "external", "credentials", "safety"],
  traces: ["TraceStep", "prerequisites", "teaches", "pitfalls", "alternatives"],
  trust: ["Wilson", "effective_LB", "auto-merge", "regression", "veto"],
  world: ["canonical", "private", "skills", "traces", "runs", "subscriptions"],
} as const;

const guideDocs = {
  "add-a-primitive": [
    "packages/runtime/src/primitives/<name>/",
    "primitive.ts",
    "meta.ts",
    "registry",
    "tests",
  ],
  "add-a-skill": [
    "SKILL.md",
    "requiredToolsets",
    "requiredCredentials",
    "provenance",
    "evidenceRunIds",
  ],
  "add-an-anti-pattern": ["ANTI-PATTERN.md", "why", "insteadDo", "relatedSkills", "evidenceRunIds"],
  "add-credentials": [
    "credentials add",
    "credentials smoke",
    "encrypted",
    "master-key",
    "VIVARIUM_CREDENTIALS_PATH",
  ],
  "author-a-trace": ["TRACE.md", "TraceStep", "prerequisites", "pitfalls", "alternatives"],
  "configure-providers": [
    "VIVARIUM_PROVIDER_PROFILES_PATH",
    "providers configure",
    "providers smoke",
    "Anthropic",
    "OpenRouter",
  ],
  "deploy-fly": ["post-v1", "out of scope for v1", "daemon", "state volume", "world mount"],
  "deploy-local-compose": [
    "docker compose",
    "vivarium-daemon",
    "8787",
    "restart: unless-stopped",
    "daemon smoke",
  ],
  "deploy-railway": ["post-v1", "out of scope for v1", "daemon", "state volume", "world mount"],
  "enable-computer-use": [
    "computer-use",
    "confirmation",
    "computerUseConfirmationLevel",
    "computer.click",
    "computer.type",
  ],
  "fork-the-world-privately": ["canonical", "private", "--auto-push", "priority", "world search"],
  install: ["bun install", "bun run lint", "init", "provider", "live-readiness"],
  "live-readiness": [
    "doctor --live",
    "Naming Gate",
    "Git Remotes",
    "Provider Environment",
    "Verification Sequence",
  ],
  "publish-a-run": ["publishable", "anonymization", "world.publishRun", "visibility", "PII"],
} as const;

const packageReadmes = {
  "apps/cli": ["dispatcher", "init", "doctor --live", "providers", "world transmission-smoke"],
  "apps/daemon": ["status", "run", "dream", "Dream scheduler", "MCP"],
  "packages/core": ["types", "kernel", "pure math", "no I/O", "decision thresholds"],
  "packages/eval": ["compounding", "benchmark", "before", "after", "Dream"],
  "packages/providers": ["OpenAI", "Anthropic", "OpenAI-compatible", "capabilities", "costClass"],
  "packages/runtime": [
    "Plan",
    "Predict",
    "Execute",
    "Monitor",
    "Recover",
    "Validate",
    "Reflect",
    "Dream",
  ],
  "packages/state": ["SQLite", "migrations", "memory", "StateRepository", "semantic facts"],
  "packages/tools": ["SelfTools", "external tools", "credentials", "anonymization", "safety"],
  "packages/world": ["retrieval", "subscriptions", "proposal", "GitHub", "visibility"],
} as const;

describe("reference docs", () => {
  test("documents every top-level self-tool group", () => {
    for (const tool of selfToolDocs) {
      const path = join("docs", "reference", "tools", `${tool}.md`);
      expect(existsSync(path), `${path} should exist`).toBe(true);
      const body = readFileSync(path, "utf8");
      expect(body).toContain("title:");
      expect(body).toContain("description:");
      expect(body).toContain("when_to_read:");
    }
  });

  test("documents named roadmap self-tool methods", () => {
    for (const [tool, methods] of Object.entries(documentedMethods)) {
      const body = readFileSync(join("docs", "reference", "tools", `${tool}.md`), "utf8");
      for (const method of methods) {
        expect(body).toContain(method);
      }
    }
  });

  test("documents the agent configuration schema fields", () => {
    const body = readFileSync(join("docs", "reference", "config-schema.md"), "utf8");
    for (const field of [
      "AgentConfig",
      "WorldSubscription",
      "ProvidersConfig",
      "ProviderRef",
      "AttentionConfig",
      "HabituationConfig",
      "SafetyConfig",
      "apiKeyEnvVar",
      "httpRateLimit",
      "computerUseConfirmationLevel",
    ]) {
      expect(body).toContain(field);
    }
  });

  test("documents core artifact reference format fields", () => {
    for (const [doc, fields] of Object.entries(referenceFormatFields)) {
      const body = readFileSync(join("docs", "reference", `${doc}.md`), "utf8");
      for (const field of fields) {
        expect(body).toContain(field);
      }
    }
  });

  test("documents architecture package ownership and data flow", () => {
    for (const [doc, terms] of Object.entries(architectureDocs)) {
      const body = readFileSync(join("docs", "architecture", `${doc}.md`), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents math formulas and thresholds", () => {
    for (const [doc, terms] of Object.entries(mathDocs)) {
      const body = readFileSync(join("docs", "math", `${doc}.md`), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents concept explanations", () => {
    for (const [doc, terms] of Object.entries(conceptDocs)) {
      const body = readFileSync(join("docs", "concepts", `${doc}.md`), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents guide workflows", () => {
    for (const [doc, terms] of Object.entries(guideDocs)) {
      const body = readFileSync(join("docs", "guides", `${doc}.md`), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("keeps guide pages free of placeholder wording", () => {
    for (const doc of Object.keys(guideDocs)) {
      const body = readFileSync(join("docs", "guides", `${doc}.md`), "utf8");
      expect(body).not.toContain("placeholder");
    }
  });

  test("documents app and package ownership readmes", () => {
    for (const [path, terms] of Object.entries(packageReadmes)) {
      const body = readFileSync(join(path, "README.md"), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });
});
