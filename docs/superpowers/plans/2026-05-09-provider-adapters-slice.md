# Provider Adapters Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tested HTTP provider adapters for Anthropic, OpenAI, and OpenAI-compatible endpoints.

**Architecture:** Reuse the existing provider completion interface. Keep adapters small, dependency-free, and testable through injected fetch.

**Tech Stack:** Bun test, TypeScript ESM, Fetch API types.

---

### Task 1: Adapter Tests

**Files:**
- Create: `packages/providers/src/http.test.ts`

- [ ] Write failing tests for OpenAI-compatible request shape and response parsing.
- [ ] Write failing tests for Anthropic request shape and response parsing.
- [ ] Run tests and confirm failure from missing exports.

### Task 2: Adapter Implementation

**Files:**
- Create: `packages/providers/src/http.ts`
- Modify: `packages/providers/src/anthropic.ts`
- Modify: `packages/providers/src/openai.ts`
- Modify: `packages/providers/src/openai-compat.ts`
- Modify: `packages/providers/src/index.ts`

- [ ] Implement shared HTTP provider types and adapters.
- [ ] Export concrete provider factory functions.
- [ ] Run adapter tests and full gates.
