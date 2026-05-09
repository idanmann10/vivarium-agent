import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const planMeta = {
  name: "plan",
  tier: "deliberate",
  costClass: "medium",
  trigger: { kind: "goal-start" },
  preferredMode: "planner",
} as const satisfies PrimitiveMeta;
