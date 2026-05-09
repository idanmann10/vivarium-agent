import type { PrimitiveMeta } from "../../../core/src/index.js";
import { dreamMeta } from "./dream/meta.js";
import { executeMeta } from "./execute/meta.js";
import { monitorMeta } from "./monitor/meta.js";
import { planMeta } from "./plan/meta.js";
import { predictMeta } from "./predict/meta.js";
import { recoverMeta } from "./recover/meta.js";
import { reflectMeta } from "./reflect/meta.js";
import { validateMeta } from "./validate/meta.js";

export interface RegisteredPrimitive {
  readonly meta: PrimitiveMeta;
}

export const primitiveRegistry = [
  { meta: planMeta },
  { meta: predictMeta },
  { meta: executeMeta },
  { meta: monitorMeta },
  { meta: recoverMeta },
  { meta: validateMeta },
  { meta: reflectMeta },
  { meta: dreamMeta },
] as const satisfies readonly RegisteredPrimitive[];

export const primitiveNames = primitiveRegistry.map((primitive) => primitive.meta.name);
