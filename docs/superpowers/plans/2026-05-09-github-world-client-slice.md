# GitHub World Client Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested GitHub API client for world PRs, regression issues, and RFC Discussions.

**Architecture:** Keep GitHub transport in `packages/world`. Accept explicit token/repo config and injectable fetch. Return stable URL/id fields for callers.

**Tech Stack:** Bun test, TypeScript ESM, Fetch API.

---

### Task 1: Tests

**Files:**
- Create: `packages/world/src/github.test.ts`

- [ ] Add failing tests for `createPullRequest`, `createIssue`, and `createDiscussion`.
- [ ] Run tests and confirm failure from missing behavior.

### Task 2: Implementation

**Files:**
- Modify: `packages/world/src/github.ts`
- Modify: `packages/world/src/index.ts`

- [ ] Implement GitHub client factory.
- [ ] Implement REST and GraphQL helpers.
- [ ] Run tests and full gates.
