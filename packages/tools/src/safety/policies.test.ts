import { describe, expect, test } from "bun:test";

import { resolveToolPolicy, resolveToolPolicyForRequest, type ToolPolicy } from "./policies.js";

describe("tool policies", () => {
  test("uses the default action when no policy matches", () => {
    expect(resolveToolPolicy("web.search", [], "approve")).toEqual({
      id: "default",
      pattern: "*",
      action: "approve",
      reason: "Default tool policy action",
    });
  });

  test("matches exact, subtree, and wildcard tool patterns", () => {
    const policies: readonly ToolPolicy[] = [
      { id: "confirm-computer", pattern: "computer.*", action: "require_confirmation" },
      { id: "block-http", pattern: "http.request", action: "block" },
      { id: "approve-all", pattern: "*", action: "approve" },
    ];

    expect(resolveToolPolicy("http.request", policies, "approve")).toMatchObject({
      id: "block-http",
      action: "block",
    });
    expect(resolveToolPolicy("computer.click", policies, "approve")).toMatchObject({
      id: "confirm-computer",
      action: "require_confirmation",
    });
    expect(resolveToolPolicy("web.search", policies, "block")).toMatchObject({
      id: "approve-all",
      action: "approve",
    });
  });

  test("uses array position before specificity when priorities are absent", () => {
    const policies: readonly ToolPolicy[] = [
      { id: "approve-http-family", pattern: "http.*", action: "approve" },
      { id: "block-http-request", pattern: "http.request", action: "block" },
    ];

    expect(resolveToolPolicy("http.request", policies, "approve")).toMatchObject({
      id: "approve-http-family",
      action: "approve",
    });
  });

  test("uses explicit priority before array position", () => {
    const policies: readonly ToolPolicy[] = [
      { id: "block-http-family", pattern: "http.*", action: "block", priority: 20 },
      { id: "approve-http-request", pattern: "http.request", action: "approve", priority: 10 },
    ];

    expect(resolveToolPolicy("http.request", policies, "block")).toMatchObject({
      id: "approve-http-request",
      action: "approve",
    });
  });

  test("uses policy id as a deterministic tie-breaker for equal priorities", () => {
    const policies: readonly ToolPolicy[] = [
      { id: "z-block-web", pattern: "web.*", action: "block", priority: 1 },
      { id: "a-confirm-web-search", pattern: "web.search", action: "require_confirmation", priority: 1 },
    ];

    expect(resolveToolPolicy("web.search", policies, "approve")).toMatchObject({
      id: "a-confirm-web-search",
      action: "require_confirmation",
    });
  });

  test("matches terminal command prefixes against simple shell segments", () => {
    const policies: readonly ToolPolicy[] = [
      {
        id: "allow-git-status",
        pattern: "terminal.run",
        commandPrefix: ["git", "status"],
        action: "approve",
      },
      {
        id: "confirm-rm",
        pattern: "terminal.run",
        commandPrefix: ["rm"],
        action: "require_confirmation",
      },
    ];

    expect(
      resolveToolPolicyForRequest(
        { toolId: "terminal.run", args: { command: "git status --short" } },
        policies,
        "block",
      ),
    ).toMatchObject({
      id: "allow-git-status",
      action: "approve",
      subject: "git status --short",
    });
    expect(
      resolveToolPolicyForRequest(
        { toolId: "terminal.run", args: { command: "rm -rf build" } },
        policies,
        "block",
      ),
    ).toMatchObject({
      id: "confirm-rm",
      action: "require_confirmation",
      subject: "rm -rf build",
    });
  });

  test("requires every shell segment to satisfy terminal prefix policies", () => {
    const policies: readonly ToolPolicy[] = [
      {
        id: "allow-git-status",
        pattern: "terminal.run",
        commandPrefix: ["git", "status"],
        action: "approve",
      },
    ];

    expect(
      resolveToolPolicyForRequest(
        { toolId: "terminal.run", args: { command: "git status --short && rm -rf build" } },
        policies,
        "block",
      ),
    ).toMatchObject({
      id: "default",
      action: "block",
      subject: "rm -rf build",
    });
  });

  test("does not apply terminal prefix policies to unsupported shell syntax", () => {
    const policies: readonly ToolPolicy[] = [
      {
        id: "allow-git-status",
        pattern: "terminal.run",
        commandPrefix: ["git", "status"],
        action: "approve",
      },
    ];

    expect(
      resolveToolPolicyForRequest(
        { toolId: "terminal.run", args: { command: "git status --short > out.txt" } },
        policies,
        "block",
      ),
    ).toMatchObject({
      id: "default",
      action: "block",
      subject: "git status --short > out.txt",
      reason: expect.stringContaining("redirection"),
    });
  });
});
