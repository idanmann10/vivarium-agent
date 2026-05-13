# Public Repo README Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public GitHub entry points for Vivarium Agent and Vivarium World more compelling while preserving the honest live-readiness boundary.

**Architecture:** Keep the work documentation-only. Update root README files with stronger hero copy, GitHub-native visual structure, quickstart paths, architecture/catalog diagrams, and clearer release status. Extend existing doc guard tests so the improved public presentation is checked.

**Tech Stack:** Markdown, Mermaid diagrams, Bun tests, existing `scripts/reference-docs.test.ts` and `../the-world/scripts/validate.test.ts` guardrails.

---

## File Structure

- Modify `README.md`: agent public entry point, hero copy, quickstart, terminal path, architecture, live boundary, links.
- Modify `scripts/reference-docs.test.ts`: guard new agent README presentation terms.
- Modify `../the-world/README.md`: world public entry point, catalog explanation, subscription/contribution flow, stats, live boundary.
- Modify `../the-world/scripts/validate.test.ts`: guard new world README presentation terms.

Do not change runtime code, CLI command behavior, world validation policy, provider configuration, credentials, release workflows, repository settings, or generated images in this pass.

### Task 1: Agent README Guardrail

**Files:**
- Modify: `scripts/reference-docs.test.ts`

- [ ] **Step 1: Write the failing test**

Add README terms to `agentRootDocs["README.md"]` that require the polished public entry point:

```ts
"Install in one command",
"Terminal-first setup",
"What grows over time",
"Release boundary",
"vivarium live evidence-init --path v1-evidence.json",
"flowchart LR",
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test scripts/reference-docs.test.ts -t "documents open-source production readiness at the repo root"
```

Expected: fail because the current README does not contain all new presentation terms.

### Task 2: Agent README Polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README**

Rewrite the top-level README structure to include:

- a sharper one-line description
- status badges
- “Install in one command”
- “Terminal-first setup”
- a Mermaid architecture diagram
- “What grows over time”
- “Release boundary”
- existing verification and policy links

Keep the live-v1 language explicit: local production readiness is not the same as `doctor --live` returning `ok:true`.

- [ ] **Step 2: Run test to verify it passes**

Run:

```bash
bun test scripts/reference-docs.test.ts -t "documents open-source production readiness at the repo root"
```

Expected: pass.

### Task 3: World README Guardrail

**Files:**
- Modify: `../the-world/scripts/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Add README terms to `worldRootDocs["README.md"]` that require the polished public entry point:

```ts
"Subscribe agents to the commons",
"What lives in the world",
"Contribution loop",
"Publication boundary",
"flowchart LR",
```

- [ ] **Step 2: Run test to verify it fails**

Run in `../the-world`:

```bash
bun test scripts/validate.test.ts -t "documents open-source production readiness"
```

Expected: fail because the current README does not contain all new presentation terms.

### Task 4: World README Polish

**Files:**
- Modify: `../the-world/README.md`

- [ ] **Step 1: Update the README**

Rewrite the top-level README structure to include:

- a sharper one-line description
- status badges
- “Subscribe agents to the commons”
- “What lives in the world”
- a Mermaid contribution-loop diagram
- current featured picks and stats
- “Publication boundary”
- validation commands and policy links

Keep the world’s status explicit: it is a seed public commons, not complete proof of the live v1 cultural loop.

- [ ] **Step 2: Run test to verify it passes**

Run in `../the-world`:

```bash
bun test scripts/validate.test.ts -t "documents open-source production readiness"
```

Expected: pass.

### Task 5: Verification And Commit

**Files:**
- Inspect: `README.md`, `scripts/reference-docs.test.ts`, `../the-world/README.md`, `../the-world/scripts/validate.test.ts`

- [ ] **Step 1: Run focused checks**

Run:

```bash
bun test scripts/reference-docs.test.ts -t "documents open-source production readiness at the repo root"
```

Run in `../the-world`:

```bash
bun test scripts/validate.test.ts -t "documents open-source production readiness"
```

- [ ] **Step 2: Run doc/release gates**

Run:

```bash
bun test scripts/reference-docs.test.ts scripts/tooling.test.ts
bun run public-release:scan
git diff --check
```

Run in `../the-world`:

```bash
bun test scripts/validate.test.ts
bun run public-release:scan
git diff --check
```

- [ ] **Step 3: Commit**

Commit the agent repo changes and the world repo changes separately because they are separate repositories.

Suggested commit messages:

```bash
docs(agent): polish public readme
docs(world): polish public readme
```

## Self-Review

- Spec coverage: Covers the user request to make public repos look cooler with images/explanation by using GitHub-native badges and Mermaid visuals, plus stronger explanations.
- Scope check: Does not require generated images, repository setting changes, or runtime changes.
- Placeholder scan: No placeholder work is included.
