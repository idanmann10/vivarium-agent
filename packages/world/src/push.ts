export const pushMode = "write-gated";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shouldPushToWorld, type Visibility } from "../../core/src/index.js";

import type { GitHubWorldClient, NumberedGitHubUrl } from "./github.js";

export interface ProposeSkillRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly contributor: string;
  readonly visibility?: Visibility;
}

export interface ProposeAntiPatternRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly why: string;
  readonly insteadDo: string;
  readonly contributor: string;
  readonly evidenceRunIds?: readonly string[];
  readonly visibility?: Visibility;
}

export interface ProposeTraceStep {
  readonly action: string;
  readonly annotation: string;
}

export interface ProposeTraceRequest {
  readonly worldRoot: string;
  readonly domain: string;
  readonly slug: string;
  readonly title: string;
  readonly contributor: string;
  readonly steps: readonly ProposeTraceStep[];
  readonly evidenceRunId?: string;
  readonly visibility?: Visibility;
}

export interface ProposeRunRequest {
  readonly worldRoot: string;
  readonly runId: string;
  readonly domain: string;
  readonly goal: string;
  readonly outcome: string;
  readonly contributor: string;
  readonly body: string;
  readonly sourceRunId?: string;
  readonly visibility?: Visibility;
}

export interface ProposalWorldTarget {
  readonly label: string;
  readonly root: string;
  readonly priority: number;
  readonly autoPushEnabled?: boolean;
}

export interface SelectProposalWorldTargetRequest {
  readonly worlds: readonly ProposalWorldTarget[];
  readonly visibility: Visibility;
}

export interface ProposeSkillToSubscribedWorldRequest extends Omit<ProposeSkillRequest, "worldRoot"> {
  readonly worlds: readonly ProposalWorldTarget[];
  readonly visibility: Visibility;
}

export interface ProposeSkillToSubscribedWorldResult {
  readonly target: ProposalWorldTarget;
  readonly path: string;
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

function proposalVisibility(visibility: Visibility | undefined): Visibility {
  return visibility ?? "public";
}

export function selectProposalWorldTarget(request: SelectProposalWorldTargetRequest): ProposalWorldTarget {
  const worlds = [...request.worlds].toSorted((left, right) => left.priority - right.priority || left.label.localeCompare(right.label));
  if (worlds.length === 0) {
    throw new Error("No world subscriptions configured");
  }

  if (request.visibility === "public") {
    return worlds.find((world) => world.autoPushEnabled !== true) ?? worlds[0]!;
  }

  return worlds.find((world) => world.autoPushEnabled === true) ?? worlds[0]!;
}

export function proposeSkill(request: ProposeSkillRequest): string {
  const directory = join(request.worldRoot, "proposals", "skills", request.domain, request.slug);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "SKILL.md");
  const visibility = proposalVisibility(request.visibility);
  writeFileSync(
    path,
    `---\nid: ${request.domain}.${request.slug}\nname: ${request.name}\ndescription: ${request.description}\ndomain: ${request.domain}\nvisibility: ${visibility}\ncontributor: ${request.contributor}\n---\n\n# ${request.name}\n\n${request.body}\n\n# Provenance\n\nProposed locally by ${request.contributor}.\n`,
  );
  return path;
}

export function proposeSkillToSubscribedWorld(request: ProposeSkillToSubscribedWorldRequest): ProposeSkillToSubscribedWorldResult {
  const target = selectProposalWorldTarget({ worlds: request.worlds, visibility: request.visibility });
  return {
    target,
    path: proposeSkill({
      worldRoot: target.root,
      domain: request.domain,
      slug: request.slug,
      name: request.name,
      description: request.description,
      body: request.body,
      contributor: request.contributor,
      visibility: request.visibility,
    }),
  };
}

function evidenceMarkdown(evidenceRunIds: readonly string[] = []): string {
  return evidenceRunIds.length === 0 ? "No evidence run IDs supplied." : evidenceRunIds.map((id) => `- ${id}`).join("\n");
}

export function proposeAntiPattern(request: ProposeAntiPatternRequest): string {
  const directory = join(request.worldRoot, "proposals", "anti-patterns", request.domain, request.slug);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "ANTI-PATTERN.md");
  const visibility = proposalVisibility(request.visibility);
  writeFileSync(
    path,
    `---\nid: ${request.domain}.${request.slug}\nname: ${request.name}\ndomain: ${request.domain}\nvisibility: ${visibility}\ncontributor: ${request.contributor}\n---\n\n# ${request.name}\n\n## What Not To Do\n\n${request.description}\n\n## Why\n\n${request.why}\n\n## Instead Do\n\n${request.insteadDo}\n\n## Evidence\n\n${evidenceMarkdown(request.evidenceRunIds)}\n\n# Provenance\n\nProposed locally by ${request.contributor}.\n`,
  );
  return path;
}

export function proposeTrace(request: ProposeTraceRequest): string {
  const directory = join(request.worldRoot, "proposals", "traces", request.domain, request.slug);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "TRACE.md");
  const visibility = proposalVisibility(request.visibility);
  writeFileSync(
    path,
    `---\nid: ${request.domain}.${request.slug}\ntitle: ${request.title}\ndomain: ${request.domain}\nvisibility: ${visibility}\ncontributor: ${request.contributor}\n---\n\n# Goal\n\n${request.title}\n\n${request.steps
      .map((step, index) => `## Step ${index + 1}\n\n${step.action}\n\nAnnotation: ${step.annotation}`)
      .join("\n\n")}\n\n# Provenance\n\nProposed locally by ${request.contributor}.\n`,
  );
  writeFileSync(
    join(directory, "steps.jsonl"),
    request.steps
      .map((step, index) => JSON.stringify({ index: index + 1, action: step.action, annotation: step.annotation }))
      .join("\n") + "\n",
  );
  writeFileSync(
    join(directory, "meta.yaml"),
    `domain: ${request.domain}\nvisibility: ${visibility}\ncontributor: ${request.contributor}\n${request.evidenceRunId === undefined ? "" : `evidence_run_id: ${request.evidenceRunId}\n`}`,
  );
  return path;
}

export function proposeRun(request: ProposeRunRequest): string {
  const directory = join(request.worldRoot, "proposals", "runs", request.runId);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "RUN.md");
  const visibility = proposalVisibility(request.visibility);
  writeFileSync(
    path,
    `# Goal\n\n${request.goal}\n\n# Outcome\n\n${request.outcome}\n\n# Transcript\n\n${request.body}\n\n# Provenance\n\nProposed locally by ${request.contributor}.\n`,
  );
  writeFileSync(
    join(directory, "episodes.jsonl"),
    `${JSON.stringify({ kind: "run_proposal", sourceRunId: request.sourceRunId ?? request.runId })}\n`,
  );
  writeFileSync(
    join(directory, "meta.yaml"),
    `id: ${request.runId}\ndomain: ${request.domain}\nvisibility: ${visibility}\ncontributor: ${request.contributor}\n${request.sourceRunId === undefined ? "" : `source_run_id: ${request.sourceRunId}\n`}`,
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
