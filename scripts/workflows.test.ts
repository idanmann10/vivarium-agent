import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function workflow(name: string): string {
  return readFileSync(join(".github", "workflows", name), "utf8");
}

describe("agent workflows", () => {
  test("CI runs the full phase checkpoint", () => {
    const ci = workflow("ci.yml");

    expect(ci).toContain("bun run lint");
    expect(ci).toContain("bun run knip");
    expect(ci).toContain("bun run typecheck");
    expect(ci).toContain("bun run test");
    expect(ci).toContain("bun run build");
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
    expect(release).toContain("bun run knip");
    expect(changesetBot).toContain("bunx changeset status");
  });
});
