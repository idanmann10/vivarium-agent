# Daemon Service Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace daemon placeholders with a deterministic local daemon service, scheduler helper, and MCP manifest.

**Architecture:** Keep the daemon transport-free. The service owns dependencies and delegates actual work to existing runtime, provider, state, tools, and world modules.

**Tech Stack:** Bun test, TypeScript ESM.

---

### Task 1: Tests

**Files:**
- Create: `apps/daemon/src/scheduler.test.ts`
- Create: `apps/daemon/src/server.test.ts`
- Create: `apps/daemon/src/mcp-server.test.ts`

- [ ] Add failing tests for scheduler timing, daemon run/dream/status handlers, and MCP manifest.
- [ ] Run tests and confirm failure from missing behavior.

### Task 2: Implementation

**Files:**
- Modify: `apps/daemon/src/scheduler.ts`
- Modify: `apps/daemon/src/server.ts`
- Modify: `apps/daemon/src/mcp-server.ts`
- Modify: `apps/daemon/src/index.ts`

- [ ] Implement deterministic helpers and exports.
- [ ] Run daemon tests and full gates.
