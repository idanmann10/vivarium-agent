import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type LocalWorldArtifactKind = "skill" | "anti-pattern" | "trace" | "run";

export interface LocalWorldSearchRequest {
  readonly domain: string;
  readonly query: string;
  readonly limit?: number;
  readonly availableToolsets?: readonly string[];
  readonly availableTools?: readonly string[];
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
  const metadataTitle = metaValue(text, "title") ?? metaValue(text, "name");
  if (metadataTitle !== undefined && metadataTitle.length > 0) {
    return metadataTitle;
  }

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

function metaList(text: string, key: string): readonly string[] {
  const value = metaValue(text, key);
  if (value === undefined) {
    return [];
  }

  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter((item) => item.length > 0);
}

function staleSkillPenalty(kind: LocalWorldArtifactKind, text: string): number {
  return kind === "skill" && metaValue(text, "stale") === "true" ? -0.5 : 0;
}

function skillConditionMatches(
  text: string,
  available: { readonly toolsets: ReadonlySet<string>; readonly tools: ReadonlySet<string> },
): boolean {
  const requiredToolsets = metaList(text, "requires_toolsets");
  const requiredTools = metaList(text, "requires_tools");
  const fallbackToolsets = metaList(text, "fallback_for_toolsets");
  const fallbackTools = metaList(text, "fallback_for_tools");

  return (
    requiredToolsets.every((toolset) => available.toolsets.has(toolset)) &&
    requiredTools.every((tool) => available.tools.has(tool)) &&
    fallbackToolsets.every((toolset) => !available.toolsets.has(toolset)) &&
    fallbackTools.every((tool) => !available.tools.has(tool))
  );
}

function runTitle(text: string, fallback: string): string {
  const goal = text.match(/# Goal\s+([\s\S]*?)(?:\n# |\n*$)/)?.[1]?.trim();
  return goal === undefined || goal.length === 0 ? fallback : goal;
}

export function createLocalWorldReader({ root }: LocalWorldReaderOptions): LocalWorldReader {
  return {
    search({ domain, query, limit = 8, availableToolsets = [], availableTools = [] }) {
      const available = { toolsets: new Set(availableToolsets), tools: new Set(availableTools) };
      const domainRoot = join(root, "domains", domain);
      const proposalRoots = [
        join(root, "proposals", "skills", domain),
        join(root, "proposals", "anti-patterns", domain),
        join(root, "proposals", "traces", domain),
      ];
      const artifactFiles = [...walk(domainRoot), ...proposalRoots.flatMap((proposalRoot) => walk(proposalRoot))].filter(
        (path) => path.endsWith("SKILL.md") || path.endsWith("ANTI-PATTERN.md") || path.endsWith("TRACE.md"),
      );
      const runFiles = [join(root, "runs"), join(root, "proposals", "runs")].flatMap((runRoot) => walk(runRoot)).filter((path) => {
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
            score: scoreText(text, query) + (kind === "anti-pattern" ? 0.5 : 0) + staleSkillPenalty(kind, text),
          };
        })
        .filter((result) => result.kind !== "skill" || skillConditionMatches(readFileSync(result.path, "utf8"), available))
        .filter((result) => result.score > 0 || result.kind === "anti-pattern" || result.kind === "trace")
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
    },
  };
}
