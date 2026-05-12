import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function workflow(name: string): string {
  return readFileSync(join(".github", "workflows", name), "utf8");
}

function githubConfig(name: string): string {
  return readFileSync(join(".github", name), "utf8");
}

function issueTemplate(name: string): string {
  return readFileSync(join(".github", "ISSUE_TEMPLATE", name), "utf8");
}

describe("agent workflows", () => {
  test("CI runs the full phase checkpoint", () => {
    const ci = workflow("ci.yml");

    expect(ci).toContain("bun run lint");
    expect(ci).toContain("bun run knip");
    expect(ci).toContain("bun run typecheck");
    expect(ci).toContain("bun run test");
    expect(ci).toContain("bun run build");
    expect(ci).toContain("bun run format:check");
    expect(ci).toContain("bun run public-release:scan");
  });

  test("CI provisions the sibling world repository required by local tests", () => {
    const ci = workflow("ci.yml");

    expect(ci).toContain("https://github.com/${{ github.repository_owner }}/vivarium-world.git");
    expect(ci).toContain("../the-world");
  });

  test("read-only workflows declare minimal token permissions", () => {
    for (const body of [workflow("ci.yml"), workflow("changeset-bot.yml")]) {
      expect(body).toContain("permissions:");
      expect(body).toContain("contents: read");
      expect(body).not.toContain("contents: write");
      expect(body).not.toContain("pull-requests: write");
    }
  });

  test("release and changeset workflows are concrete", () => {
    const release = workflow("release.yml");
    const changesetBot = workflow("changeset-bot.yml");

    for (const body of [release, changesetBot]) {
      expect(body).not.toContain("placeholder");
      expect(body).not.toContain("after Phase 0");
      expect(body).toContain("bun install --frozen-lockfile");
    }

    expect(release).toContain("changesets/action@v1");
    expect(release).toContain(
      "https://github.com/${{ github.repository_owner }}/vivarium-world.git",
    );
    expect(release).toContain("../the-world");
    expect(release).toContain("bun run knip");
    expect(release).toContain("bun run format:check");
    expect(changesetBot).toContain("bunx changeset status");
  });

  test("CodeQL analyzes JavaScript and TypeScript on main and pull requests", () => {
    const codeql = workflow("codeql.yml");

    expect(codeql).toContain("name: CodeQL");
    expect(codeql).toContain("workflow_dispatch:");
    expect(codeql).toContain("branches: [main]");
    expect(codeql).toContain("if: ${{ !github.event.repository.private }}");
    expect(codeql).toContain("security-events: write");
    expect(codeql).toContain("github/codeql-action/init@v4");
    expect(codeql).toContain("languages: javascript-typescript");
    expect(codeql).toContain("queries: security-extended,security-and-quality");
    expect(codeql).toContain("github/codeql-action/analyze@v4");
  });

  test("Dependabot keeps Bun dependencies and GitHub Actions current", () => {
    const dependabot = githubConfig("dependabot.yml");

    expect(dependabot).toContain("version: 2");
    expect(dependabot).toContain('package-ecosystem: "bun"');
    expect(dependabot).toContain('package-ecosystem: "github-actions"');
    expect(dependabot).toContain('directory: "/"');
    expect(dependabot).toContain("interval: weekly");
    expect(dependabot).toContain("open-pull-requests-limit: 5");
  });

  test("CODEOWNERS routes runtime and release surfaces to the maintainer", () => {
    const codeowners = githubConfig("CODEOWNERS");

    for (const rule of [
      "* @idanmann10",
      "apps/ @idanmann10",
      "packages/ @idanmann10",
      "docs/ @idanmann10",
      ".github/ @idanmann10",
      "SECURITY.md @idanmann10",
      "RELEASING.md @idanmann10",
    ]) {
      expect(codeowners).toContain(rule);
    }
  });

  test("issue templates route bug reports and feature requests", () => {
    const bug = issueTemplate("bug_report.yml");
    const feature = issueTemplate("feature_request.yml");
    const config = issueTemplate("config.yml");

    expect(bug).toContain("name: Bug report");
    expect(bug).toContain("Affected surface");
    expect(bug).toContain("Reproduction steps");
    expect(bug).toContain("doctor --live");
    expect(bug).toContain("labels:");

    expect(feature).toContain("name: Feature request");
    expect(feature).toContain("Problem");
    expect(feature).toContain("Proposed behavior");
    expect(feature).toContain("Live-readiness boundary");
    expect(feature).toContain("labels:");

    expect(config).toContain("blank_issues_enabled: false");
    expect(config).toContain("Security reports");
    expect(config).toContain("Live-readiness guide");
  });
});
