import { describe, expect, test } from "bun:test";

import { evaluateHttpSafety } from "./pipeline.js";

describe("safety pipeline", () => {
  test("allows allowlisted read requests and blocks destructive requests without confirmation", () => {
    expect(
      evaluateHttpSafety({
        url: "https://api.github.com/repos/owner/repo",
        method: "GET",
        allowlist: ["https://api.github.com"],
        destructiveRequiresConfirmation: true,
        confirmed: false,
      }).allowed,
    ).toBe(true);

    expect(
      evaluateHttpSafety({
        url: "https://api.github.com/repos/owner/repo",
        method: "DELETE",
        allowlist: ["https://api.github.com"],
        destructiveRequiresConfirmation: true,
        confirmed: false,
      }).allowed,
    ).toBe(false);
  });
});
