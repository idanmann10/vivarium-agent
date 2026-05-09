import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps", "packages", "scripts", "tests"];
const banned = [
  { pattern: new RegExp("\\b" + "a" + "ny\\b"), reason: "Avoid unsafely broad type; use unknown and narrow." },
  { pattern: /export \* from /, reason: "Avoid fan-out barrel exports; export explicit public surfaces." },
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return walk(path);
    }

    return path.endsWith(".ts") ? [path] : [];
  });
}

const files = roots.flatMap((root) => walk(root));
const failures: string[] = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (const [lineIndex, line] of lines.entries()) {
    for (const rule of banned) {
      if (rule.pattern.test(line)) {
        failures.push(`${file}:${lineIndex + 1}: ${rule.reason}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`lint ok: ${files.length} TypeScript files scanned`);
