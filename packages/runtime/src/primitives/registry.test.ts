import { describe, expect, test } from "bun:test";

import { primitiveNames, primitiveRegistry } from "./registry.js";

describe("primitiveRegistry", () => {
  test("registers all v1 primitives with metadata", () => {
    expect(primitiveNames).toEqual(["plan", "predict", "execute", "monitor", "recover", "validate", "reflect", "dream"]);
    expect(primitiveRegistry.map((primitive) => primitive.meta.name)).toEqual(primitiveNames);
    expect(primitiveRegistry.find((primitive) => primitive.meta.name === "monitor")?.meta.trigger).toEqual({
      kind: "every-n-steps",
      n: 5,
    });
    expect(primitiveRegistry.find((primitive) => primitive.meta.name === "dream")?.meta.trigger).toEqual({
      kind: "scheduled",
      cron: "0 3 * * *",
    });
  });
});
