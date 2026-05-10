export const pushMode = "write-gated";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shouldPushToWorld } from "../../core/src/index.js";

import type { GitHubWorldClient, NumberedGitHubUrl } from "./github.js";

export interface ProposeSkillRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly contributor: string;
}

export interface SkillPushGateEvidence {
  readonly lowerBound: number;
  readonly uses: number;
  readonly coverage: number;
}

export interface ProposeSkillPullRequestRequest extends ProposeSkillRequest {
  readonly gate: SkillPushGateEvidence;
  readonly client: Pick<GitHubWorldClient, "createPullRequest">;
  readonly head: string;
  readonly base: string;
  readonly title?: string;
  readonly pullRequestBody?: string;
}

export type ProposeSkillPullRequestResult =
  | {
      readonly pushed: true;
      readonly path: string;
      readonly gate: SkillPushGateEvidence;
      readonly pullRequest: NumberedGitHubUrl;
    }
  | {
      readonly pushed: false;
      readonly path: string;
      readonly gate: SkillPushGateEvidence;
      readonly reason: "Push gate not satisfied";
    };

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

export async function proposeSkillPullRequest(
  request: ProposeSkillPullRequestRequest,
): Promise<ProposeSkillPullRequestResult> {
  const path = proposeSkill(request);

  if (!shouldPushToWorld(request.gate)) {
    return { pushed: false, path, gate: request.gate, reason: "Push gate not satisfied" };
  }

  const relativePath = join("proposals", "skills", request.domain, request.slug, "SKILL.md");
  const pullRequest = await request.client.createPullRequest({
    title: request.title ?? `Add skill: ${request.name}`,
    body:
      request.pullRequestBody ??
      `Proposes \`${relativePath}\` after passing the local push gate.\n\n` +
        `Evidence: lowerBound=${request.gate.lowerBound}, uses=${request.gate.uses}, coverage=${request.gate.coverage}.`,
    head: request.head,
    base: request.base,
  });

  return { pushed: true, path, gate: request.gate, pullRequest };
}
