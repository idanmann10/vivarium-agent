import { describe, expect, test } from "bun:test";

import { createLocalProvider } from "./local.js";
import { routeProvider } from "./router.js";

describe("provider routing", () => {
  test("selects the cheapest provider that satisfies cost and capabilities", () => {
    const cheap = createLocalProvider({ id: "cheap", costClass: "cheap", capabilities: ["chat"] });
    const medium = createLocalProvider({ id: "medium", costClass: "medium", capabilities: ["chat", "json_mode"] });

    expect(routeProvider([medium, cheap], { costClass: "medium", capabilities: ["json_mode"] })?.id).toBe("medium");
    expect(routeProvider([medium, cheap], { costClass: "cheap", capabilities: ["chat"] })?.id).toBe("cheap");
  });

  test("local provider returns deterministic text by task kind", async () => {
    const provider = createLocalProvider({ id: "local", costClass: "cheap", capabilities: ["chat", "json_mode"] });

    await expect(provider.complete({ kind: "plan", input: "write tests" })).resolves.toContain("Plan:");
    await expect(provider.complete({ kind: "validate", input: "output" })).resolves.toContain("Validation:");
  });
});
