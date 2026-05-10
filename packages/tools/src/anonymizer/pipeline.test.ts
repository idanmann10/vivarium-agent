import { describe, expect, test } from "bun:test";

import { anonymizeText, anonymizeTextWithProvider } from "./pipeline.js";

describe("anonymizeText", () => {
  test("redacts emails, bearer tokens, and home paths", () => {
    const text = "Email idan@example.com used Bearer sk-secret-token in /Users/idanmann/project.";

    expect(anonymizeText(text)).toBe("Email [REDACTED_EMAIL] used Bearer [REDACTED_TOKEN] in [REDACTED_HOME]/project.");
  });

  test("uses provider scrubber after deterministic redaction", async () => {
    const result = await anonymizeTextWithProvider("Email idan@example.com from /Users/idanmann/project", {
      id: "scrubber",
      costClass: "cheap",
      capabilities: ["chat"],
      async complete(request) {
        expect(request.kind).toBe("anonymize");
        expect(request.input).not.toContain("idan@example.com");
        return `${request.input} scrubbed by provider`;
      },
    });

    expect(result.method).toBe("provider");
    expect(result.text).toContain("scrubbed by provider");
    expect(result.text).not.toContain("idan@example.com");
  });

  test("falls back to deterministic redaction when provider scrubber fails", async () => {
    const result = await anonymizeTextWithProvider("Email idan@example.com used Bearer sk-secret-token", {
      id: "failing-scrubber",
      costClass: "cheap",
      capabilities: ["chat"],
      async complete() {
        throw new Error("provider unavailable");
      },
    });

    expect(result).toEqual({
      method: "regex-fallback",
      text: "Email [REDACTED_EMAIL] used Bearer [REDACTED_TOKEN]",
    });
  });
});
