import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const monitorMeta = {
  name: "monitor",
  tier: "reflexive",
  costClass: "cheap",
  trigger: { kind: "every-n-steps", n: 5 },
  preferredMode: "executor",
} as const satisfies PrimitiveMeta;
