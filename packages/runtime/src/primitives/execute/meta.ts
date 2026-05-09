import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const executeMeta = {
  name: "execute",
  tier: "deliberate",
  costClass: "medium",
  trigger: { kind: "manual" },
  preferredMode: "executor",
} as const satisfies PrimitiveMeta;
