import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type LocalWorldArtifactKind = "skill" | "anti-pattern" | "trace";

export interface LocalWorldSearchRequest {
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
}

export interface LocalWorldSearchResult {
  readonly kind: LocalWorldArtifactKind;
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly score: number;
}

export interface LocalWorldReader {
  search(request: LocalWorldSearchRequest): readonly LocalWorldSearchResult[];
}

export interface LocalWorldReaderOptions {
  readonly root: string;
}

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function titleFromMarkdown(text: string, fallback: string): string {
  const heading = text
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^# /, "")
    .trim();

  return heading ?? fallback;
}

function scoreText(text: string, query: string): number {
  const normalized = text.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  return terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

export function createLocalWorldReader({ root }: LocalWorldReaderOptions): LocalWorldReader {
  return {
    search({ domain, query, limit = 8 }) {
      const domainRoot = join(root, "domains", domain);
      const proposalRoot = join(root, "proposals", "skills", domain);
      const files = [...walk(domainRoot), ...walk(proposalRoot)].filter(
        (path) => path.endsWith("SKILL.md") || path.endsWith("ANTI-PATTERN.md") || path.endsWith("TRACE.md"),
      );

      return files
        .map((path) => {
          const text = readFileSync(path, "utf8");
          const kind: LocalWorldArtifactKind = path.endsWith("SKILL.md")
            ? "skill"
            : path.endsWith("ANTI-PATTERN.md")
              ? "anti-pattern"
              : "trace";
          return {
            kind,
            id: path.replace(`${root}/`, ""),
            title: titleFromMarkdown(text, path),
            path,
            score: scoreText(text, query) + (kind === "anti-pattern" ? 0.5 : 0),
          };
        })
        .filter((result) => result.score > 0 || result.kind === "anti-pattern" || result.kind === "trace")
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
    },
  };
}
