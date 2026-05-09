import type { PrimitiveMeta } from "../../../../core/src/index.js";

export const predictMeta = {
  name: "predict",
  tier: "reflexive",
  costClass: "cheap",
  trigger: { kind: "before-tool" },
  preferredMode: "executor",
} as const satisfies PrimitiveMeta;
