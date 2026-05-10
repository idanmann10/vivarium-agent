import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type LocalWorldArtifactKind = "skill" | "anti-pattern" | "trace" | "run";

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

function metaValue(text: string, key: string): string | undefined {
  return text
    .split("\n")
    .find((line) => line.startsWith(`${key}:`))
    ?.slice(key.length + 1)
    .trim();
}

function runTitle(text: string, fallback: string): string {
  const goal = text.match(/# Goal\s+([\s\S]*?)(?:\n# |\n*$)/)?.[1]?.trim();
  return goal === undefined || goal.length === 0 ? fallback : goal;
}

export function createLocalWorldReader({ root }: LocalWorldReaderOptions): LocalWorldReader {
  return {
    search({ domain, query, limit = 8 }) {
      const domainRoot = join(root, "domains", domain);
      const proposalRoots = [
        join(root, "proposals", "skills", domain),
        join(root, "proposals", "anti-patterns", domain),
        join(root, "proposals", "traces", domain),
      ];
      const artifactFiles = [...walk(domainRoot), ...proposalRoots.flatMap((proposalRoot) => walk(proposalRoot))].filter(
        (path) => path.endsWith("SKILL.md") || path.endsWith("ANTI-PATTERN.md") || path.endsWith("TRACE.md"),
      );
      const runFiles = walk(join(root, "runs")).filter((path) => {
        if (!path.endsWith("RUN.md")) {
          return false;
        }

        const metaPath = path.replace(/RUN\.md$/, "meta.yaml");
        return existsSync(metaPath) && metaValue(readFileSync(metaPath, "utf8"), "domain") === domain;
      });
      const files = [...artifactFiles, ...runFiles];

      return files
        .map((path) => {
          const text = readFileSync(path, "utf8");
          const kind: LocalWorldArtifactKind = path.endsWith("SKILL.md")
            ? "skill"
            : path.endsWith("ANTI-PATTERN.md")
              ? "anti-pattern"
              : path.endsWith("TRACE.md")
                ? "trace"
                : "run";
          return {
            kind,
            id: path.replace(`${root}/`, ""),
            title: kind === "run" ? runTitle(text, path) : titleFromMarkdown(text, path),
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
