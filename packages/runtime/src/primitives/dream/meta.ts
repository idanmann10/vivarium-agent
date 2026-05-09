import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const dreamMeta = {
  name: "dream",
  tier: "reflexive",
  costClass: "expensive",
  trigger: { kind: "scheduled", cron: "0 3 * * *" },
  preferredMode: "consolidator",
} as const satisfies PrimitiveMeta;
