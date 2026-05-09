import { describe, expect, test } from "bun:test";

import { anonymizeText } from "./pipeline.js";

describe("anonymizeText", () => {
  test("redacts emails, bearer tokens, and home paths", () => {
    const text = "Email idan@example.com used Bearer sk-secret-token in /Users/idanmann/project.";

    expect(anonymizeText(text)).toBe("Email [REDACTED_EMAIL] used Bearer [REDACTED_TOKEN] in [REDACTED_HOME]/project.");
  });
});
