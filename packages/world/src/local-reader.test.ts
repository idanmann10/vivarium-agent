import { describe, expect, test } from "bun:test";

import { createLocalWorldReader } from "./local-reader.js";

describe("local world reader", () => {
  test("retrieves seeded skills, anti-patterns, and traces by domain and query", () => {
    const world = createLocalWorldReader({ root: "../the-world" });

    const results = world.search({ domain: "coding", query: "test before implementation" });

    expect(results.some((result) => result.kind === "skill" && result.title.includes("Red Green"))).toBe(true);
    expect(results.some((result) => result.kind === "anti-pattern")).toBe(true);
    expect(results.some((result) => result.kind === "trace")).toBe(true);
  });
});
