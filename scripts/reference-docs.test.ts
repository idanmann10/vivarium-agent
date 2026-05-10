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
});
