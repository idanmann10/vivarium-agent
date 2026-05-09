import { existsSync } from "node:fs";

const requiredEntrypoints = [
  "apps/cli/src/index.ts",
  "apps/daemon/src/index.ts",
  "packages/core/src/index.ts",
  "packages/state/src/index.ts",
  "packages/runtime/src/index.ts",
  "packages/tools/src/index.ts",
  "packages/providers/src/index.ts",
  "packages/world/src/index.ts",
  "packages/eval/src/index.ts",
];

const missing = requiredEntrypoints.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error(`Missing build entrypoints:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`build ok: ${requiredEntrypoints.length} entrypoints present`);
