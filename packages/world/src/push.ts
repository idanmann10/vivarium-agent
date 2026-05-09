export const pushMode = "write-gated";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ProposeSkillRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly contributor: string;
}

export function proposeSkill(request: ProposeSkillRequest): string {
  const directory = join(request.worldRoot, "proposals", "skills", request.domain, request.slug);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "SKILL.md");
  writeFileSync(
    path,
    `---\nid: ${request.domain}.${request.slug}\nname: ${request.name}\ndescription: ${request.description}\ndomain: ${request.domain}\nvisibility: public\ncontributor: ${request.contributor}\n---\n\n# ${request.name}\n\n${request.body}\n\n# Provenance\n\nProposed locally by ${request.contributor}.\n`,
  );
  return path;
}
