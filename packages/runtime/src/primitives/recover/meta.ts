import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const recoverMeta = {
  name: "recover",
  tier: "deliberate",
  costClass: "medium",
  trigger: { kind: "monitor-signal" },
  preferredMode: "planner",
} as const satisfies PrimitiveMeta;
