import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const validateMeta = {
  name: "validate",
  tier: "reflexive",
  costClass: "medium",
  trigger: { kind: "after-output" },
  preferredMode: "validator",
} as const satisfies PrimitiveMeta;
