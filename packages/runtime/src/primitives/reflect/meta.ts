import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const reflectMeta = {
  name: "reflect",
  tier: "deliberate",
  costClass: "medium",
  trigger: { kind: "goal-end" },
  preferredMode: "reflector",
} as const satisfies PrimitiveMeta;
