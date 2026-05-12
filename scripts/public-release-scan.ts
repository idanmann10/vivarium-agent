import { readFileSync } from "node:fs";

export interface PublicReleaseFile {
  readonly path: string;
  readonly text: string;
}

const blockedPathRules = [
  {
    pattern: /(^|\/)live-readiness\.local\.env$/,
    reason: "filled live-readiness env files must stay untracked",
  },
  {
    pattern: /(^|\/)[^/]*credentials\.enc$/,
    reason: "encrypted credential stores must stay outside the repository",
  },
] as const;

const blockedTextRules = [
  {
    pattern: /sk-ant-api[0-9a-zA-Z_-]{20,}/,
    reason: "possible Anthropic API key",
  },
  {
    pattern: /sk-or-v1-[0-9a-zA-Z_-]{20,}/,
    reason: "possible OpenRouter API key",
  },
  {
    pattern: /sk-proj-[0-9a-zA-Z_-]{20,}/,
    reason: "possible OpenAI API key",
  },
  {
    pattern: /\bgh[pousr]_[0-9A-Za-z_]{30,}\b/,
    reason: "possible GitHub token",
  },
] as const;

export function scanPublicReleaseFiles(files: readonly PublicReleaseFile[]): readonly string[] {
  const failures: string[] = [];

  for (const file of files) {
    for (const rule of blockedPathRules) {
      if (rule.pattern.test(file.path)) {
        failures.push(`${file.path}: ${rule.reason}`);
      }
    }

    const lines = file.text.split("\n");
    for (const [lineIndex, line] of lines.entries()) {
      for (const rule of blockedTextRules) {
        if (rule.pattern.test(line)) {
          failures.push(`${file.path}:${lineIndex + 1}: ${rule.reason}`);
        }
      }
    }
  }

  return failures;
}

function trackedFiles(): readonly string[] {
  const result = Bun.spawnSync(["git", "ls-files", "-z"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`git ls-files failed: ${stderr}`);
  }

  return new TextDecoder()
    .decode(result.stdout)
    .split("\0")
    .filter((path) => path.length > 0);
}

function readTrackedFiles(paths: readonly string[]): readonly PublicReleaseFile[] {
  return paths.map((path) => ({ path, text: readFileSync(path, "utf8") }));
}

if (import.meta.main) {
  const failures = scanPublicReleaseFiles(readTrackedFiles(trackedFiles()));

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log("public release scan ok");
}
