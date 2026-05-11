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

const selfToolMethodDocs = {
  memory: ["write(request)", "recall(query, limit?)", "list(domain?)", "forget(id)", "summarize()"],
  skills: [
    "list(status?)",
    "habitual(domain?)",
    "search(query)",
    "view(id)",
    "use(id, helped?)",
    "lineage(id)",
  ],
  "anti-patterns": [
    "search(context, domain?)",
    "view(id, domain?)",
    "flag(skillId, reason, domain?, runId?)",
  ],
  traces: ["search(topic, domain?)", "read(id, domain?)", "author(runId, annotations, domain?)"],
  runs: ["create(run)", "get(id)", "update(run)", "search(query, domain?)", "read(id)"],
  episodes: [
    "append(episode)",
    "list(runId)",
    "note(request)",
    "surprise(request)",
    "recallRun(runId)",
  ],
  world: [
    "search(request)",
    "pull(request)",
    "propose(request)",
    "publishRun(request)",
    "publishTrace(request)",
    "subscribe(request)",
    "listSubscriptions()",
    "lineage(skillId, domain)",
    "contributors(domain?)",
    "featured()",
    "stats()",
    "reportRegression(request)",
  ],
  curriculum: ["read(domain)", "progress(domain)", "advance(domain, stepIndex)"],
  identity: ["summary()", "stage(domain)", "history(limit?)"],
  attention: ["focus(request)", "defocus()", "status()"],
  confidence: ["record(confidence, correct)"],
  publishables: ["queue(artifact)", "list()"],
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
  install: ["bun install", "bun run lint", "bun run knip", "init", "provider", "live-readiness"],
  "live-readiness": [
    "doctor --live",
    "--env-file live-readiness.local.env",
    "chmod 600 live-readiness.local.env",
    "liveEnvFile.permissions:insecure",
    "source live-readiness.local.env",
    "VIVARIUM_CREDENTIALS_MASTER_KEY",
    "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
    "Naming Gate",
    "Git Remotes",
    "Provider Environment",
    "Verification Sequence",
  ],
  "publish-a-run": ["publishable", "anonymization", "world.publishRun", "visibility", "PII"],
} as const;

const liveReadinessEnvVars = [
  "VIVARIUM_AGENT_REPO_NAME",
  "VIVARIUM_WORLD_REPO_NAME",
  "VIVARIUM_GITHUB_OWNER",
  "VIVARIUM_GITHUB_REPOSITORY_ID",
  "VIVARIUM_GITHUB_DISCUSSION_CATEGORY_ID",
  "VIVARIUM_WORLD_SUBSCRIPTIONS_PATH",
  "VIVARIUM_CANONICAL_WORLD_REF",
  "VIVARIUM_PRIVATE_WORLD_REF",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "VIVARIUM_OAI_COMPAT_API_KEY",
  "VIVARIUM_OAI_COMPAT_BASE_URL",
  "VIVARIUM_OAI_COMPAT_MODEL",
  "VIVARIUM_PROVIDER_PROFILES_PATH",
  "VIVARIUM_ANTHROPIC_PROVIDER_PROFILE",
  "VIVARIUM_OPENROUTER_PROVIDER_PROFILE",
  "VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE",
  "VIVARIUM_CREDENTIALS_PATH",
  "VIVARIUM_CREDENTIALS_MASTER_KEY",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_NAME",
  "VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE",
  "VIVARIUM_INTERNAL_API_HEALTH_URL",
  "VIVARIUM_V1_EVIDENCE_PATH",
  "GITHUB_TOKEN",
  "GH_TOKEN",
] as const;

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

const topLevelDocs = {
  "docs/README.md": [
    "thesis.md",
    "architecture/",
    "concepts/",
    "guides/",
    "reference/",
    "math/",
    "demos/",
    "live-readiness.env.example",
  ],
  "docs/thesis.md": [
    "kernel",
    "world",
    "Generative Agents",
    "Voyager",
    "DGM",
    "MAGELLAN",
    "sleep consolidation",
    "identity",
    "cultural transmission",
    "local-first",
  ],
  "docs/demos/README.md": [
    "local-e2e.cast",
    "asciinema v2",
    "init",
    "run",
    "world transmission-smoke",
    "verify:sqlite-stack",
  ],
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

  test("documents implemented self-tool methods", () => {
    for (const [tool, methods] of Object.entries(selfToolMethodDocs)) {
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

  test("documents Claude Managed Agents and subagent format constraints", () => {
    const body = readFileSync(join("docs", "reference", "claude-agent-formats.md"), "utf8");
    for (const term of [
      "Claude Managed Agents",
      "packages/core/src/types/claude-agent-format.ts",
      "CLAUDE_MANAGED_AGENTS_BETA_HEADER",
      "ClaudeManagedAgentCreateRequest",
      "ClaudeCodeSubagentFrontmatter",
      "Agent",
      "Environment",
      "Session",
      "Events",
      "name",
      "model",
      "system",
      "tools",
      "mcp_servers",
      "skills",
      "multiagent",
      "description",
      "metadata",
      "managed-agents-2026-04-01",
      "claude-opus-4-7",
      "Claude model overview",
      "claude-sonnet-4-6",
      "OpenRouter",
      "anthropic/claude-sonnet-4.6",
      ".claude/agents/",
      "~/.claude/agents/",
      "--agents",
      "initialPrompt",
      "maxTurns",
      "memory",
      "effort",
      "background",
      "color",
      "Managed settings",
      "Plugin",
      "Agent(worker, researcher)",
      "isolation: worktree",
    ]) {
      expect(body).toContain(term);
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

  test("documents the live-readiness environment template", () => {
    const path = join("docs", "live-readiness.env.example");
    expect(existsSync(path), `${path} should exist`).toBe(true);
    const body = existsSync(path) ? readFileSync(path, "utf8") : "";
    expect(body).toContain("doctor --live");
    expect(body).toContain("--env-file live-readiness.local.env");
    expect(body).toContain("chmod 600 live-readiness.local.env");
    expect(body).toContain("source live-readiness.local.env");
    expect(body).toContain("Do not commit");
    expect(body).toContain("live-readiness.local.env");
    for (const envVar of liveReadinessEnvVars) {
      expect(body).toContain(`export ${envVar}=`);
    }
  });

  test("documents durable live-readiness artifact paths", () => {
    const guide = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const example = readFileSync(join("docs", "live-readiness.env.example"), "utf8");
    for (const path of [
      "/Users/idanmann/.codex/memories/vivarium-world-subscriptions.json",
      "/Users/idanmann/.codex/memories/vivarium-provider-profiles.json",
      "/Users/idanmann/.codex/memories/vivarium-credentials.enc",
      "/Users/idanmann/.codex/memories/vivarium-v1-evidence.json",
    ]) {
      expect(guide).toContain(path);
      expect(example).toContain(path);
    }
  });

  test("uses inspectable references in the live-readiness evidence manifest example", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    for (const opaqueReference of [
      "run-id-or-audit-link",
      '"trace-a"',
      '"trace-b"',
      '"skill-a"',
      '"skill-b"',
      "proposal path or PR",
    ]) {
      expect(body).not.toContain(opaqueReference);
    }
    for (const inspectableReference of [
      "docs/live/anti-pattern-avoided.md",
      "docs/live/trace-a.md",
      "docs/live/skill-candidate-a.md",
      "https://github.com/owner/world/pull/1",
    ]) {
      expect(body).toContain(inspectableReference);
    }
  });

  test("documents live credential commands with exported environment variables", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    for (const term of [
      '--path "$VIVARIUM_CREDENTIALS_PATH"',
      '--master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY"',
      '--name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME"',
      '--value "$VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"',
      '--url "$VIVARIUM_INTERNAL_API_HEALTH_URL"',
    ]) {
      expect(body).toContain(term);
    }
  });

  test("ignores filled live-readiness environment files", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    for (const pattern of ["live-readiness.local.env", "docs/live-readiness.local.env"]) {
      expect(gitignore).toContain(pattern);
    }
    expect(gitignore).toContain("!docs/live-readiness.env.example");
  });

  test("documents app and package ownership readmes", () => {
    for (const [path, terms] of Object.entries(packageReadmes)) {
      const body = readFileSync(join(path, "README.md"), "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents top-level thesis and doc navigation", () => {
    for (const [path, terms] of Object.entries(topLevelDocs)) {
      const body = readFileSync(path, "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });
});
