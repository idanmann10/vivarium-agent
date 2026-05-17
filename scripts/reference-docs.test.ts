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
  "managed-agent-model": [
    "session log",
    "harness",
    "brain",
    "hands",
    "sandbox",
    "credential boundary",
    "provider profiles",
    "encrypted credential store",
    "world subscriptions",
    "CLI",
    "daemon",
    "MCP manifest",
    "doctor --live",
  ],
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
  tools: ["dispatcher", "SelfTools", "external", "tool policies", "credentials", "safety"],
  traces: ["TraceStep", "prerequisites", "teaches", "pitfalls", "alternatives"],
  trust: ["Wilson", "effective_LB", "auto-merge", "regression", "veto"],
  world: ["canonical", "private", "skills", "traces", "runs", "subscriptions"],
} as const;

function readAfterInstallationBlock(path: string): string {
  const body = readFileSync(path, "utf8");
  const marker = "After installation, reload your shell if needed and run:\n\n```bash\n";
  const start = body.indexOf(marker);
  expect(start, `${path} should document the after-install command block`).not.toBe(-1);
  const blockStart = start + marker.length;
  const blockEnd = body.indexOf("\n```", blockStart);
  expect(blockEnd, `${path} should close the after-install command block`).not.toBe(-1);
  return body.slice(blockStart, blockEnd);
}

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
    "vivarium setup live",
    "vivarium connect signup",
    "vivarium connect fill",
    "vivarium connect setup --confirm-write",
    "vivarium connect smoke",
    "credentials add",
    "credentials smoke",
    "encrypted",
    "master-key",
  ],
  "author-a-trace": ["TRACE.md", "TraceStep", "prerequisites", "pitfalls", "alternatives"],
  "configure-providers": [
    "vivarium setup live",
    "VIVARIUM_PROVIDER_PROFILES_PATH",
    "providers configure",
    "providers smoke",
    "connect signup",
    "connect fill",
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
  install: [
    "curl -fsSL",
    "scripts/install.sh",
    "bun install",
    "bun run lint",
    "bun run knip",
    "VIVARIUM_INSTALL_DIR",
    "VIVARIUM_BIN_DIR",
    "VIVARIUM_DAEMON=launchd",
    "LaunchAgent",
    "vivarium daemon smoke",
    "vivarium local",
    "vivarium local run",
    "vivarium launch handoff",
    "vivarium connect",
    "vivarium connect signup",
    "vivarium proof",
    "vivarium proof init",
    "vivarium help",
    "vivarium status",
    "vivarium update",
    "setup",
    "init",
    "provider",
    "live-readiness",
  ],
  "live-readiness": [
    "doctor --live",
    "connect init",
    "vivarium connect",
    "proof",
    "liveEnvFile.permissions:insecure",
    "source ~/.vivarium/live/live-readiness.local.env",
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
  "apps/cli": [
    "dispatcher",
    "setup",
    "connect",
    "connect setup",
    "proof",
    "init",
    "doctor --live",
    "completionGuide",
    "providers",
    "world transmission-smoke",
  ],
  "apps/daemon": ["status", "run", "dream", "Dream scheduler", "MCP"],
  "packages/core": [
    "types",
    "kernel",
    "pure math",
    "no I/O",
    "decision thresholds",
    "ClaudeManagedAgentCreateRequest",
    "ClaudeManagedEnvironmentCreateRequest",
    "ClaudeManagedSessionCreateRequest",
    "ClaudeManagedEvent",
    "ClaudeManagedEventsSendRequest",
  ],
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
  "packages/tools": [
    "SelfTools",
    "external tools",
    "tool policies",
    "credentials",
    "anonymization",
    "safety",
  ],
  "packages/world": ["retrieval", "subscriptions", "proposal", "GitHub", "visibility"],
} as const;

const topLevelDocs = {
  "docs/README.md": [
    "thesis.md",
    "architecture/",
    "managed-agent-model.md",
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

const installedCliDocs = [
  "README.md",
  "docs/guides/add-credentials.md",
  "docs/guides/configure-providers.md",
  "docs/guides/deploy-local-compose.md",
  "docs/guides/fork-the-world-privately.md",
  "docs/guides/install.md",
  "docs/guides/live-readiness.md",
] as const;

const agentRootDocs = {
  "README.md": [
    "Vivarium Agent",
    "[![CI](https://github.com/idanmann10/vivarium-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/idanmann10/vivarium-agent/actions/workflows/ci.yml)",
    "[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)",
    "![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-black)",
    "![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)",
    "local-first",
    "Production Status",
    "Architecture At A Glance",
    "brain",
    "hands",
    "session log",
    "Install in one command",
    "Terminal-first setup",
    "What grows over time",
    "Release boundary",
    "vivarium launch handoff",
    "flowchart LR",
    "managed-agent-model.md",
    "Quick Start",
    "bun run knip",
    "bun run public-release:scan",
    "doctor --live",
    "live-readiness.local.env",
    "SECURITY.md",
    "SUPPORT.md",
    "CODE_OF_CONDUCT.md",
    "RELEASING.md",
    "LICENSE",
    "MIT",
  ],
  "CONTRIBUTING.md": [
    "Vivarium Agent",
    "Conventional Commits",
    "changeset",
    "bun run knip",
    "bun run public-release:scan",
    "Security",
    "doctor --live",
    "live-readiness.local.env",
  ],
  "SECURITY.md": [
    "Vivarium Agent",
    "vulnerability",
    "security",
    "credential",
    "live-readiness.local.env",
    "doctor --live",
  ],
  "SUPPORT.md": [
    "Vivarium Agent",
    "support",
    "bug report",
    "feature request",
    "security",
    "live-readiness",
    "GitHub Discussions",
  ],
  "CODE_OF_CONDUCT.md": ["Vivarium Agent", "Code of Conduct", "harassment", "Enforcement"],
  "RELEASING.md": [
    "Vivarium Agent",
    "release",
    "changeset",
    "bun run knip",
    "bun run public-release:scan",
    "bun run launch:security-audit",
    "doctor --live",
    "live-readiness.local.env",
    "LICENSE",
    "public GitHub repository",
    "private preview",
    "CodeQL",
    "secret scanning",
    "push protection",
    "private vulnerability reporting",
    "branch protection",
    "repository rulesets",
    "recommended baseline",
    "Require pull request reviews",
    "Require status checks to pass",
    "Block force pushes",
    "Block deletions",
  ],
  LICENSE: ["MIT License", "Vivarium contributors", "Permission is hereby granted"],
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
      "ClaudeManagedEnvironmentCreateRequest",
      "ClaudeManagedSessionCreateRequest",
      "ClaudeManagedEvent",
      "ClaudeManagedEventsSendRequest",
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
      "environment_id",
      "vault_ids",
      "{domain}.{action}",
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

  test("keeps public operator docs on installed CLI commands", () => {
    for (const path of installedCliDocs) {
      const body = readFileSync(path, "utf8");
      expect(body).not.toContain("bun apps/cli/src/main.ts");
      expect(body).toContain("vivarium ");
    }
  });

  test("keeps install docs on the installed local-first setup sequence", () => {
    for (const path of ["README.md", join("docs", "guides", "install.md")]) {
      const body = readFileSync(path, "utf8");
      const block = readAfterInstallationBlock(path);
      for (const stage of [
        "# [1] Initialize local memory",
        "# [2] Run the local agent",
        "# [3] Review launch handoff",
        "# [4] Keep moving",
      ]) {
        expect(block).toContain(stage);
      }
      for (const command of [
        "vivarium local",
        "vivarium local run",
        "vivarium launch handoff",
        "vivarium status",
        "vivarium help",
        "vivarium update",
      ]) {
        expect(block).toContain(command);
      }
      expect(block).not.toContain("Verify the Mac daemon");
      expect(block).not.toContain(
        "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
      );
      expect(body).toContain("vivarium daemon smoke --status-url http://127.0.0.1:8787/status");
      expect(body).toContain(
        "Use `vivarium launch handoff` when you are ready for production evidence.",
      );
      expect(body).toContain(
        "If you run `vivarium local run` before `vivarium local`, the command seeds the same starter memory first",
      );
      expect(body).toContain(
        "If the local SQLite state file is invalid, `vivarium local run` stops before writing new run data",
      );
      expect(body).toContain(
        "Use `vivarium setup live` when you are ready to create provider keys",
      );
      expect(body).toContain(
        "`vivarium connect signup` reopens model provider, GitHub/public release, and internal credential handoff",
      );
      expect(body).toContain("local value map");
      expect(body).toContain("~/.vivarium/secrets/anthropic.key");
      expect(body).toContain("~/.vivarium/secrets/internal-health-url.txt");
      expect(body).not.toContain("only need to reopen the provider account links");
      expect(body).toContain(
        "Use `vivarium connect wizard` only when you want to choose those paths yourself",
      );
      const liveSetupPath = body.indexOf("Live setup path:");
      const advancedLiveControls = body.indexOf("Advanced live setup controls", liveSetupPath);
      const customWizard = body.indexOf("vivarium connect wizard", advancedLiveControls);
      expect(liveSetupPath).toBeGreaterThan(-1);
      expect(advancedLiveControls).toBeGreaterThan(liveSetupPath);
      expect(customWizard).toBeGreaterThan(advancedLiveControls);
      for (const command of [
        "vivarium setup live",
        "vivarium connect signup",
        "vivarium connect",
        "vivarium connect setup --confirm-write",
        "vivarium connect smoke",
        "vivarium proof init",
        "vivarium proof",
        "vivarium doctor --live",
      ]) {
        expect(body.slice(liveSetupPath, advancedLiveControls)).toContain(command);
      }
      expect(body).not.toContain("same guided connect wizard");
      expect(block).not.toContain("\nvivarium model\n");
      expect(block).not.toContain("\nvivarium doctor\n");
      expect(block).not.toContain("\nvivarium onboard\n");
      expect(block).not.toContain("\nvivarium setup\n");
      expect(block).not.toContain('vivarium run --goal "validate local setup"');
      expect(block).not.toContain("vivarium setup --quick");
      expect(block).not.toContain("VIVARIUM_");
      expect(block).not.toContain("live-readiness.local.env");
    }
    const installGuide = readFileSync(join("docs", "guides", "install.md"), "utf8");
    expect(installGuide).toContain("Use the source-checkout shortcuts");
    expect(installGuide).toContain("bun run quickstart");
    expect(installGuide).toContain("bun run local");
    expect(installGuide).toContain("bun run local:run");
    expect(installGuide).toContain("bun run vivarium -- local");
    expect(installGuide).toContain("prints the next local commands for a first run");
    expect(installGuide).not.toContain("first run, live setup, and `doctor --live`");
  });

  test("documents installed CLI terminal color controls", () => {
    for (const path of ["README.md", join("docs", "guides", "install.md")]) {
      const body = readFileSync(path, "utf8");
      for (const term of [
        "VIVARIUM_COLOR=always",
        "VIVARIUM_COLOR=never",
        "VIVARIUM_THEME=matrix",
        "VIVARIUM_THEME=amber",
        "NO_COLOR",
        "FORCE_COLOR",
      ]) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents live env init public prefill flags", () => {
    for (const path of ["README.md", join("docs", "guides", "install.md")]) {
      const body = readFileSync(path, "utf8");
      for (const term of [
        "--github-owner",
        "--agent-repo",
        "--world-repo",
        "--canonical-world-ref",
        "--private-world-ref",
      ]) {
        expect(body).toContain(term);
      }
    }
  });

  test("documents a safe pre-main Mac handoff command", () => {
    const body = readFileSync(join("docs", "guides", "install.md"), "utf8");

    for (const term of [
      "Pre-main Mac install",
      "VIVARIUM_AGENT_REF=<branch-or-tag-or-commit>",
      "VIVARIUM_DAEMON=launchd",
      "`vivarium launch handoff` to print the same branch-pinned install command",
      "vivarium launch handoff --ref main",
      "~/.vivarium/vivarium-agent",
      "~/.vivarium/the-world",
      "~/.local/bin/vivarium",
      "live-readiness.local.env",
      "vivarium daemon smoke --status-url http://127.0.0.1:8787/status",
      "vivarium local run",
    ]) {
      expect(body).toContain(term);
    }
  });

  test("documents the launch security branch protection terminal workflow", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");

    for (const term of [
      "Launch Security Audit",
      "bun run launch:security-audit",
      "branches/main/protection",
      "required_status_checks",
      "VIVARIUM_AGENT_REPO_NAME",
      "VIVARIUM_WORLD_REPO_NAME",
      "Require pull request reviews",
      "Require status checks to pass",
      "Block force pushes",
      "Block deletions",
    ]) {
      expect(body).toContain(term);
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
    expect(body).toContain("vivarium setup live");
    expect(body).toContain("connect init");
    expect(body).toContain("Do not commit");
    expect(body).toContain("live-readiness.local.env");
    expect(body).toContain("vivarium connect init");
    expect(body).toContain("vivarium connect");
    expect(body).toContain("vivarium connect signup");
    expect(body).toContain("vivarium connect setup --confirm-write");
    expect(body).toContain("vivarium connect setup --confirm-write");
    expect(body).toContain("vivarium connect smoke");
    expect(body).toContain("vivarium proof init");
    expect(body).toContain("vivarium proof");
    expect(body).not.toContain("vivarium providers smoke");
    expect(body).not.toContain("vivarium credentials smoke");
    expect(body).toContain("vivarium doctor --live");
    expect(body).toContain('export VIVARIUM_ANTHROPIC_MODEL="claude-sonnet-4-6"');
    expect(body).toContain('export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW="1000000"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_MODEL="openrouter/auto"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"');
    expect(body).toContain('export VIVARIUM_OPENROUTER_CONTEXT_WINDOW="2000000"');
    expect(body).not.toContain('export VIVARIUM_OPENROUTER_BASE_URL="<openrouter-base-url>"');
    expect(body).not.toContain("bun apps/cli/src/main.ts");
    expect(body).not.toContain("vivarium live env-init --path live-readiness.local.env");
    for (const envVar of liveReadinessEnvVars) {
      expect(body).toContain(`export ${envVar}=`);
    }
  });

  test("documents durable live-readiness artifact paths", () => {
    const guide = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const example = readFileSync(join("docs", "live-readiness.env.example"), "utf8");
    for (const path of [
      "$HOME/.vivarium/live/world-subscriptions.json",
      "$HOME/.vivarium/live/provider-profiles.json",
      "$HOME/.vivarium/live/credentials.enc",
      "$HOME/.vivarium/live/v1-evidence.json",
    ]) {
      expect(guide).toContain(path);
      expect(example).toContain(path);
    }
  });

  test("documents the default private live-readiness setup file", () => {
    const readme = readFileSync("README.md", "utf8");
    const installGuide = readFileSync(join("docs", "guides", "install.md"), "utf8");
    const liveGuide = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const example = readFileSync(join("docs", "live-readiness.env.example"), "utf8");

    for (const body of [readme, installGuide, liveGuide]) {
      expect(body).toContain("~/.vivarium/live/live-readiness.local.env");
    }
    expect(example).toContain("$HOME/.vivarium/live/live-readiness.local.env");
    expect(readme).not.toContain("--live-env-path live-readiness.local.env");
    expect(installGuide).not.toContain("Local live-readiness env file: `live-readiness.local.env`");
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
      "--secrets-dir",
      "--setup-dir",
    ]) {
      expect(body).toContain(term);
    }
  });

  test("keeps live provider setup on friendly fill before raw env wiring", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const providerSection = body.indexOf("## Provider Environment");
    const signupHandoff = body.indexOf("vivarium connect signup", providerSection);
    const localSetupFiles = body.indexOf("private-base-url.txt", signupHandoff);
    const rerunSetup = body.indexOf("vivarium setup live", localSetupFiles);
    const rawExport = body.indexOf("export ANTHROPIC_API_KEY=<redacted>", providerSection);

    expect(providerSection).not.toBe(-1);
    expect(signupHandoff).toBeGreaterThan(providerSection);
    expect(localSetupFiles).toBeGreaterThan(signupHandoff);
    expect(rerunSetup).toBeGreaterThan(localSetupFiles);
    expect(rawExport).toBeGreaterThan(rerunSetup);
    expect(body).toContain("Manual env-key reference");
  });

  test("keeps live internal credential setup on friendly commands before raw credential wiring", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const credentialSection = body.indexOf("## Internal API Credential");
    const signupHandoff = body.indexOf("vivarium connect signup", credentialSection);
    const localSetupFile = body.indexOf("internal-health-url.txt", signupHandoff);
    const rerunSetup = body.indexOf("vivarium setup live", localSetupFile);
    const guardedWrite = body.indexOf("vivarium connect setup --confirm-write", rerunSetup);
    const guidedSmoke = body.indexOf("vivarium connect smoke", guardedWrite);
    const lowLevelReference = body.indexOf("Low-level credential commands", guidedSmoke);
    const rawCredentialsAdd = body.indexOf("vivarium credentials add", credentialSection);
    const rawExport = body.indexOf("export VIVARIUM_CREDENTIALS_PATH", credentialSection);

    expect(credentialSection).not.toBe(-1);
    expect(signupHandoff).toBeGreaterThan(credentialSection);
    expect(localSetupFile).toBeGreaterThan(signupHandoff);
    expect(rerunSetup).toBeGreaterThan(localSetupFile);
    expect(guardedWrite).toBeGreaterThan(rerunSetup);
    expect(guidedSmoke).toBeGreaterThan(guardedWrite);
    expect(lowLevelReference).toBeGreaterThan(guidedSmoke);
    expect(rawCredentialsAdd).toBeGreaterThan(lowLevelReference);
    expect(rawExport).toBeGreaterThan(lowLevelReference);
  });

  test("keeps live repo, GitHub, and world setup on generated local files before raw env wiring", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const namingSection = body.indexOf("## Naming Gate");
    const providerSection = body.indexOf("## Provider Environment");
    const manualEnvReference = body.indexOf("### Manual env-key reference");
    const githubSection = body.indexOf("## GitHub Auth");
    const worldSection = body.indexOf("## Multi-World Subscriptions");
    const namingFile = body.indexOf("agent-repo-name.txt", namingSection);
    const githubSignupHandoff = body.indexOf("vivarium connect signup", githubSection);
    const githubFile = body.indexOf("github-token.key", githubSignupHandoff);
    const friendlyGithubSmoke = body.indexOf("vivarium github smoke", githubFile);
    const friendlyGithubDiscussion = body.indexOf(
      "vivarium github discussion --confirm-write",
      githubFile,
    );
    const friendlyAgentCi = body.indexOf(
      "vivarium github workflow-runs --target agent",
      githubFile,
    );
    const friendlyWorldCi = body.indexOf(
      "vivarium github workflow-runs --target world",
      githubFile,
    );
    const lowLevelTokenPath = body.indexOf("Low-level token path", githubFile);
    const worldFile = body.indexOf("canonical-world-ref.txt", worldSection);
    const rawAgentName = body.indexOf("export VIVARIUM_AGENT_REPO_NAME");
    const rawGithubToken = body.indexOf("export GITHUB_TOKEN");
    const rawCanonicalWorldRef = body.indexOf("export VIVARIUM_CANONICAL_WORLD_REF");

    expect(namingSection).toBeGreaterThan(-1);
    expect(providerSection).toBeGreaterThan(namingSection);
    expect(manualEnvReference).toBeGreaterThan(providerSection);
    expect(githubSection).toBeGreaterThan(manualEnvReference);
    expect(worldSection).toBeGreaterThan(githubSection);
    expect(namingFile).toBeGreaterThan(namingSection);
    expect(namingFile).toBeLessThan(manualEnvReference);
    expect(githubSignupHandoff).toBeGreaterThan(githubSection);
    expect(githubFile).toBeGreaterThan(githubSignupHandoff);
    expect(friendlyGithubSmoke).toBeGreaterThan(githubFile);
    expect(friendlyGithubDiscussion).toBeGreaterThan(friendlyGithubSmoke);
    expect(friendlyAgentCi).toBeGreaterThan(friendlyGithubDiscussion);
    expect(friendlyWorldCi).toBeGreaterThan(friendlyAgentCi);
    expect(lowLevelTokenPath).toBeGreaterThan(friendlyWorldCi);
    expect(worldFile).toBeGreaterThan(worldSection);
    expect(rawAgentName).toBeGreaterThan(manualEnvReference);
    expect(rawGithubToken).toBeGreaterThan(manualEnvReference);
    expect(rawCanonicalWorldRef).toBeGreaterThan(manualEnvReference);
    expect(body.slice(0, manualEnvReference)).not.toContain("export VIVARIUM_AGENT_REPO_NAME");
    expect(body.slice(0, manualEnvReference)).not.toContain("export GITHUB_TOKEN");
    expect(body.slice(0, manualEnvReference)).not.toContain("export VIVARIUM_CANONICAL_WORLD_REF");
  });

  test("keeps internal credential setup on friendly live setup before raw commands", () => {
    const body = readFileSync(join("docs", "guides", "add-credentials.md"), "utf8");
    const friendlySetup = body.indexOf("vivarium setup live");
    const signupHandoff = body.indexOf("vivarium connect signup", friendlySetup);
    const localSetupFile = body.indexOf("internal-health-url.txt", signupHandoff);
    const rerunSetup = body.indexOf("vivarium setup live", localSetupFile);
    const guardedWrite = body.indexOf("vivarium connect setup --confirm-write", rerunSetup);
    const guidedSmoke = body.indexOf("vivarium connect smoke", guardedWrite);
    const lowLevelCommands = body.indexOf("## Low-Level Commands", guidedSmoke);
    const firstRawCredentialKey = body.indexOf("VIVARIUM_CREDENTIALS_PATH");

    expect(friendlySetup).toBeGreaterThan(-1);
    expect(signupHandoff).toBeGreaterThan(friendlySetup);
    expect(localSetupFile).toBeGreaterThan(signupHandoff);
    expect(rerunSetup).toBeGreaterThan(localSetupFile);
    expect(guardedWrite).toBeGreaterThan(rerunSetup);
    expect(guidedSmoke).toBeGreaterThan(guardedWrite);
    expect(lowLevelCommands).toBeGreaterThan(guidedSmoke);
    expect(firstRawCredentialKey).toBeGreaterThan(lowLevelCommands);
    expect(body.slice(0, lowLevelCommands)).not.toContain("export VIVARIUM_");
  });

  test("keeps live readiness guide on setup live first", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const setupLive = body.indexOf("vivarium setup live");
    const connectWizard = body.indexOf("vivarium connect wizard");
    const manualEnvReference = body.indexOf("### Manual env-key reference");
    const rawSource = body.indexOf("source ~/.vivarium/live/live-readiness.local.env");

    expect(setupLive).not.toBe(-1);
    expect(connectWizard).toBeGreaterThan(setupLive);
    expect(manualEnvReference).toBeGreaterThan(connectWizard);
    expect(rawSource).toBeGreaterThan(manualEnvReference);
    expect(body).toContain("Use `vivarium connect wizard` only when you need custom paths");
    expect(body).toContain("`vivarium connect signup` shows a local value map");
    expect(body).toContain("~/.vivarium/secrets/github-token.key");
    expect(body).toContain("~/.vivarium/secrets/private-context-window.txt");
    expect(body).not.toContain("guided connect wizard in one command");
  });

  test("keeps provider configuration guide on setup live first", () => {
    const body = readFileSync(join("docs", "guides", "configure-providers.md"), "utf8");
    const setupLive = body.indexOf("vivarium setup live");
    const connectWizard = body.indexOf("vivarium connect wizard");
    const localSetupFile = body.indexOf("private-base-url.txt", setupLive);
    const rerunSetup = body.indexOf("vivarium setup live", localSetupFile);
    const guardedWrite = body.indexOf("vivarium connect setup --confirm-write", rerunSetup);
    const guidedSmoke = body.indexOf("vivarium connect smoke", guardedWrite);
    const lowLevelReference = body.indexOf("## Low-Level Provider Commands", guidedSmoke);
    const rawExport = body.indexOf("export ANTHROPIC_API_KEY=<redacted>");
    const rawProvidersConfigure = body.indexOf("vivarium providers configure", setupLive);

    expect(setupLive).not.toBe(-1);
    expect(connectWizard).toBeGreaterThan(setupLive);
    expect(localSetupFile).toBeGreaterThan(setupLive);
    expect(rerunSetup).toBeGreaterThan(localSetupFile);
    expect(guardedWrite).toBeGreaterThan(rerunSetup);
    expect(guidedSmoke).toBeGreaterThan(guardedWrite);
    expect(lowLevelReference).toBeGreaterThan(guidedSmoke);
    expect(rawExport).toBeGreaterThan(lowLevelReference);
    expect(rawProvidersConfigure).toBeGreaterThan(lowLevelReference);
    expect(body).toContain("Use `vivarium connect wizard` only when you need custom paths");
    expect(body).not.toContain("--env-file live-readiness.local.env");
  });

  test("keeps provider-backed goal examples on the friendly local run command", () => {
    for (const path of [
      join("docs", "guides", "configure-providers.md"),
      join("docs", "guides", "live-readiness.md"),
    ]) {
      const body = readFileSync(path, "utf8");

      expect(body).toContain("vivarium local run \\");
      expect(body).not.toContain("vivarium run \\");
    }
  });

  test("documents the current production blocker map", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    for (const term of [
      "## Current Production Blocker Map",
      "Model providers",
      "Internal credential smoke",
      "V1 evidence manifest",
      "reviewed installer branch lands on",
      "`main`. For pre-main validation",
      "PR review",
      "status belongs in the active PR or audit",
      "state is not one of the current `doctor --live` blockers",
      "doctor --live reports `36 passing, 17 blocked`",
      "Provider accounts: 8 blockers",
      "Internal credential: 3 blockers",
      "V1 evidence: 6 blockers",
      "Default private setup file",
      "needs real values",
      "missing",
    ]) {
      expect(body).toContain(term);
    }
    expect(body).toContain("Already clear:");
    expect(body).not.toContain("PR #26 remains under required review");
    expect(body).not.toContain("Mac installer and handoff PRs have already merged");
    expect(body).not.toContain("GitHub live checks |");
  });

  test("documents live unlock keys by operator purpose", () => {
    const guide = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const example = readFileSync(join("docs", "live-readiness.env.example"), "utf8");
    const unlockMap = guide.indexOf("## Operator Unlock Key Map");
    const namingGate = guide.indexOf("## Naming Gate", unlockMap);
    const manualEnvReference = guide.indexOf("### Manual env-key reference");
    const unlockMapBody = guide.slice(unlockMap, namingGate);

    expect(unlockMap).toBeGreaterThan(-1);
    expect(namingGate).toBeGreaterThan(unlockMap);
    expect(manualEnvReference).toBeGreaterThan(namingGate);
    for (const term of [
      "## Operator Unlock Key Map",
      "Provider accounts and models",
      "Provider accounts and models | `vivarium connect signup`",
      "vivarium setup live",
      "vivarium connect fill",
      "Provider profiles",
      "Encrypted credentials/internal API",
      "Encrypted credentials/internal API | `vivarium connect signup`",
      "vivarium connect setup --confirm-write",
      "GitHub/public release",
      "GitHub/public release | `vivarium connect signup`",
      "world subscribe",
      "V1 evidence manifest",
      "vivarium proof init",
    ]) {
      expect(unlockMapBody).toContain(term);
    }
    expect(unlockMapBody).not.toContain("ANTHROPIC_API_KEY");
    expect(unlockMapBody).not.toContain("VIVARIUM_");
    expect(unlockMapBody).not.toContain("GITHUB_TOKEN");
    expect(guide.indexOf("ANTHROPIC_API_KEY")).toBeGreaterThan(manualEnvReference);
    expect(guide.indexOf("VIVARIUM_OPENROUTER_BASE_URL")).toBeGreaterThan(manualEnvReference);
    expect(guide.indexOf("GITHUB_TOKEN")).toBeGreaterThan(manualEnvReference);
    for (const term of [
      "# Provider keys/models",
      "# Provider profiles",
      "# Encrypted credential store and internal API smoke target",
      "# GitHub/public release",
      "# Live v1 evidence manifest",
    ]) {
      expect(example).toContain(term);
    }
  });

  test("documents the operator v1 completion boundary in the live-readiness guide", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    for (const term of [
      "## Completion Boundary",
      "`doctor --live` returns `ok:true`",
      "provider.anthropicSmoke:ok",
      "provider.openrouterSmoke:ok",
      "provider.privateOaiCompatSmoke:ok",
      "credentials.smoke:ok",
      "v1.realGoals:configured",
      "v1.publicContribution:configured",
      "v1.twoWeekImprovement:configured",
      "at least fourteen days after the last real goal",
    ]) {
      expect(body).toContain(term);
    }
  });

  test("keeps live readiness setup on the connect-created evidence manifest path", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const v1Section = body.indexOf("## V1 Evidence Manifest");
    const completionBoundary = body.indexOf("## Completion Boundary", v1Section);
    const v1SectionBody = body.slice(v1Section, completionBoundary);
    const proofInit = v1SectionBody.indexOf("vivarium proof init");
    const rawEvidencePath = v1SectionBody.indexOf("VIVARIUM_V1_EVIDENCE_PATH");
    const liveEvidenceInit = v1SectionBody.indexOf("vivarium live evidence-init");

    expect(v1Section).toBeGreaterThan(-1);
    expect(completionBoundary).toBeGreaterThan(v1Section);
    expect(proofInit).toBeGreaterThan(-1);
    expect(rawEvidencePath).toBeGreaterThan(proofInit);
    expect(liveEvidenceInit).toBeGreaterThan(proofInit);
    expect(body).toContain("evidence manifest skeleton");
    expect(body).toContain("evidence-manifest file readiness");
    expect(body).toContain("`doctor --live` checks the required v1 evidence content");
    expect(body).toContain(
      "Run `connect setup --confirm-write` if the wizard did not already confirm the write, saving the provider profile file, encrypted credential store, and evidence manifest skeleton.",
    );
    expect(body).toContain("Run `proof init`");
    expect(body).toContain("Run `connect smoke`");
    expect(body).toContain("Run `proof`");
    expect(body).not.toContain("Initialize `VIVARIUM_V1_EVIDENCE_PATH` with `live evidence-init`");
  });

  test("documents the connect dashboard across live setup groups", () => {
    for (const path of [
      "README.md",
      join("apps", "cli", "README.md"),
      join("docs", "guides", "live-readiness.md"),
    ]) {
      const body = readFileSync(path, "utf8");
      expect(body).toContain("names/world");
      expect(body).toContain("GitHub/public release");
      expect(body).toContain("provider");
      expect(body).toContain("internal credential");
      expect(body).toContain("evidence");
      expect(body).not.toContain("provider, credential, and evidence readiness");
      expect(body).not.toContain(
        "provider, encrypted internal-credential, and evidence-manifest file readiness",
      );
    }
  });

  test("keeps the live verification sequence on all connect setup groups", () => {
    const body = readFileSync(join("docs", "guides", "live-readiness.md"), "utf8");
    const sequence = body.slice(body.indexOf("## Verification Sequence"));

    expect(sequence).toContain(
      "plain-language names/world, GitHub/public release, provider, internal credential, and evidence labels",
    );
    expect(sequence).toContain(
      "dashboard reports the names/world, GitHub/public release, provider, internal credential, and evidence file setup sections ready",
    );
    expect(sequence).not.toContain(
      "plain-language provider, internal credential, and evidence-manifest labels",
    );
    expect(sequence).not.toContain(
      "dashboard reports the provider, internal credential, and evidence file setup sections ready",
    );
  });

  test("documents connect fill across all live setup groups", () => {
    for (const path of [
      join("apps", "cli", "README.md"),
      join("docs", "guides", "live-readiness.md"),
    ]) {
      const body = readFileSync(path, "utf8");
      const normalized = body.replaceAll(/\s+/g, " ");
      expect(normalized).toContain(
        "`connect fill` updates names/world, GitHub/public release, provider, internal credential, and evidence values by friendly setup labels",
      );
      expect(normalized).not.toContain(
        "`connect fill` writes common provider and internal credential values by friendly setup labels",
      );
      expect(normalized).not.toContain(
        "`vivarium connect fill` can also update common provider and internal",
      );
    }
  });

  test("keeps public live setup snippets on group-neutral local file wording", () => {
    for (const path of ["README.md", join("docs", "guides", "install.md")]) {
      const body = readFileSync(path, "utf8");
      expect(body).toContain("Paste requested values into ~/.vivarium/secrets, then:");
      expect(body).not.toContain(
        "Paste the provider keys and internal token into ~/.vivarium/secrets",
      );
      expect(body).not.toContain(
        "Paste repo, GitHub, world, provider, and internal values into ~/.vivarium/secrets",
      );
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

  test("keeps the CLI app README on the connect live setup path", () => {
    const body = readFileSync(join("apps", "cli", "README.md"), "utf8");
    const commandGroups = body.indexOf("Implemented command groups include:");
    const lowLevelBoundary = body.indexOf("Lower-level/debug command groups");
    const credentialsCommands = body.indexOf("credentials add/list/smoke");
    const providerCommands = body.indexOf("providers configure/list/smoke");
    const liveCommands = body.indexOf("live env-init/setup/evidence-init");

    expect(commandGroups).toBeGreaterThan(-1);
    expect(lowLevelBoundary).toBeGreaterThan(commandGroups);
    expect(credentialsCommands).toBeGreaterThan(lowLevelBoundary);
    expect(providerCommands).toBeGreaterThan(lowLevelBoundary);
    expect(liveCommands).toBeGreaterThan(lowLevelBoundary);
    expect(body).toContain("connect init");
    expect(body).toContain("connect signup");
    expect(body).toContain("connect");
    expect(body).toContain("connect fill");
    expect(body).toContain("connect setup --confirm-write");
    expect(body).toContain("connect smoke");
    expect(body).toContain("proof init");
    expect(body).toContain("proof");
    expect(body).toContain("names/world");
    expect(body).toContain("GitHub/public release");
    expect(body).toContain("provider, internal credential, and evidence readiness");
    expect(body).toContain("friendly setup labels");
    expect(body).toContain("evidence manifest skeleton");
    expect(body).toContain(
      "remains available as the lower-level setup-file creation command for custom paths",
    );
    expect(body).not.toContain("connect init creates the private local readiness file");
    expect(body).not.toContain("existing `live setup` path");
  });

  test("documents top-level thesis and doc navigation", () => {
    for (const [path, terms] of Object.entries(topLevelDocs)) {
      const body = readFileSync(path, "utf8");
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("keeps the checked-in local e2e demo on current local run output", () => {
    const body = readFileSync(join("docs", "demos", "local-e2e.cast"), "utf8");

    expect(body).toContain("Vivarium Run");
    expect(body).toContain("Status: success");
    expect(body).toContain("Provider: local");
    expect(body).toContain("Memory: <demo-state.db>");
    expect(body).toContain('Outcome: Observation: executed \\"build a tiny local agent\\"');
    expect(body).toContain("Last run: build a tiny local agent");
    expect(body).toContain("Run ID: run-demo-000");
    expect(body).toContain("Readiness file: <demo-live-readiness.local.env>");
    expect(body).toContain("--world-root <demo-world>");
    expect(body).toContain("run-demo-000");
    expect(body).toContain("vivarium status\\n  vivarium launch handoff\\n  vivarium model");
    expect(body).not.toContain("/Users/");
    expect(body).not.toContain("vivarium-local-e2e-demo-");
    expect(body).not.toContain("Memory: /");
  });

  test("documents the v1 completion boundary in the active audit", () => {
    const body = readFileSync(
      join("docs", "superpowers", "audits", "2026-05-10-v1-completion-audit-refresh.md"),
      "utf8",
    );
    for (const term of [
      "### Do Not Mark Complete Until",
      "`doctor --live` returns `ok:true`",
      "provider.anthropicSmoke:ok",
      "provider.openrouterSmoke:ok",
      "provider.privateOaiCompatSmoke:ok",
      "credentials.smoke:ok",
      "v1.realGoals:configured",
      "v1.publicContribution:configured",
      "v1.twoWeekImprovement:configured",
      "at least fourteen days after the last real goal",
    ]) {
      expect(body).toContain(term);
    }
  });

  test("documents current launch security audit evidence", () => {
    const body = readFileSync(
      join("docs", "superpowers", "audits", "2026-05-10-github-live-setup.md"),
      "utf8",
    );
    for (const term of [
      "Launch security audit",
      "`bun run launch:security-audit`",
      "vivarium-agent`, public",
      "vivarium-world`, public",
      "secretScanning",
      "pushProtection",
      "branchProtection",
      "zero open Dependabot, secret scanning, and code scanning alerts",
    ]) {
      expect(body).toContain(term);
    }
  });

  test("documents the current Mac install handoff audit", () => {
    const path = join("docs", "superpowers", "audits", "2026-05-14-mac-install-handoff.md");
    expect(existsSync(path), `${path} should exist`).toBe(true);
    const body = existsSync(path) ? readFileSync(path, "utf8") : "";
    for (const term of [
      "curl -fsSL https://raw.githubusercontent.com/idanmann10/vivarium-agent/main/scripts/install.sh",
      "VIVARIUM_DAEMON=launchd",
      "installed checkout",
      "branch `codex/local-agent-production-ready`",
      "clean status",
      "Stable reinstalls recover from old branch-pinned checkouts",
      "Fresh installs prefill safe public metadata",
      "origin` set to `https://github.com/idanmann10/vivarium-agent.git",
      "vivarium update",
      "/Users/idanmann/.bun/bin/bun install --frozen-lockfile",
      "/Users/idanmann/.local/bin/vivarium` now executes `/Users/idanmann/.bun/bin/bun",
      "Status: ok",
      "`524 pass, 0 fail`",
      "`36 passing, 17 blocked`",
      "`4 passing, 4 blocked`",
      "PR #26",
      "Live/v1 production readiness blockers",
      "issue #9",
      "`vivarium launch handoff`",
      "<current-commit>",
      "current commit-pinned installer URL",
      "branch protection remained intact",
      "Operator Handoff",
      "vivarium local run",
      "provider keys",
      "two-week improvement evidence",
    ]) {
      expect(body).toContain(term);
    }
    const hardcodedCommitInstallerLines = body.split(/\r?\n/).filter((line) => {
      const looksLikeInstallerCommand =
        line.startsWith("curl -fsSL ") &&
        line.includes("idanmann10/vivarium-agent/") &&
        line.includes("/scripts/install.sh");
      return (
        looksLikeInstallerCommand &&
        !line.includes("/main/scripts/install.sh") &&
        !line.includes("/<current-commit>/scripts/install.sh")
      );
    });
    expect(hardcodedCommitInstallerLines).toEqual([]);
    expect(body).not.toMatch(/\bat `[0-9a-f]{7,40}`/);
  });

  test("documents open-source production readiness at the repo root", () => {
    for (const [path, terms] of Object.entries(agentRootDocs)) {
      expect(existsSync(path), `${path} should exist`).toBe(true);
      const body = existsSync(path) ? readFileSync(path, "utf8") : "";
      for (const term of terms) {
        expect(body).toContain(term);
      }
    }
  });

  test("keeps public setup docs on friendly evidence labels", () => {
    for (const path of ["README.md", join("apps", "cli", "README.md")]) {
      const body = readFileSync(path, "utf8");
      expect(body).toContain("evidence");
      expect(body).not.toContain("VIVARIUM_V1_EVIDENCE_PATH");
    }
  });
});
