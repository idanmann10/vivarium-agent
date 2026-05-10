import {
  agentId,
  episodeId,
  runId,
  type Episode,
  type RunId,
} from "../../core/src/index.js";
import type { LocalProvider } from "../../providers/src/index.js";
import { anonymizeText, type SelfTools } from "../../tools/src/index.js";
import { applyAttentionLimits, type AttentionLimits } from "./attention.js";
import { runExecutePrimitive } from "./primitives/execute/index.js";
import { runMonitorPrimitive } from "./primitives/monitor/index.js";
import { runPlanPrimitive } from "./primitives/plan/index.js";
import { runPredictPrimitive } from "./primitives/predict/index.js";
import { runRecoverPrimitive } from "./primitives/recover/index.js";
import { runReflectPrimitive } from "./primitives/reflect/index.js";
import { runValidatePrimitive } from "./primitives/validate/index.js";
import { classifyGoalSafety } from "./safety.js";

export const runSkeleton = ["plan", "predict", "execute", "monitor", "recover", "validate", "reflect"] as const;

export interface RunGoalRequest {
  readonly goal: string;
  readonly domain: string;
  readonly agentName: string;
  readonly provider: LocalProvider;
  readonly tools: SelfTools;
  readonly forceFailure?: boolean;
  readonly attentionLimits?: AttentionLimits;
  readonly destructiveConfirmed?: boolean;
  readonly surprises?: readonly string[];
}

export interface RunGoalResult {
  readonly runId: RunId;
  readonly success: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function makeEpisodeId(runNumber: string, index: number) {
  return episodeId(`${runNumber}-episode-${index}`);
}

function preloadHabitualSkills(
  habitualSkills: ReturnType<SelfTools["skills"]["habitual"]>,
  worldResults: ReturnType<SelfTools["world"]["search"]>,
): ReturnType<SelfTools["world"]["search"]> {
  const habitualIds = new Set(habitualSkills.map((skill) => skill.id));
  return [...habitualSkills, ...worldResults.filter((result) => result.kind !== "skill" || !habitualIds.has(result.id))];
}

type EpisodeBody = {
  [Kind in Episode["kind"]]: Omit<
    Extract<Episode, { readonly kind: Kind }>,
    "id" | "runId" | "agentId" | "timestamp" | "tags"
  > & { readonly tags?: readonly string[] };
}[Episode["kind"]];

export async function runGoal(request: RunGoalRequest): Promise<RunGoalResult> {
  const runNumber = `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const id = runId(runNumber);
  const localAgentId = agentId(request.agentName);
  const timestamp = now();

  request.tools.runs.create({
    id,
    agentId: localAgentId,
    domain: request.domain,
    goal: request.goal,
    startedAt: timestamp,
    endedAt: null,
    success: null,
    score: null,
    notes: "",
    publishable: false,
    published: false,
    publishedAt: null,
    visibility: "private",
  });

  let index = 1;
  const append = (episode: EpisodeBody) => {
    request.tools.episodes.append({
      id: makeEpisodeId(runNumber, index),
      runId: id,
      agentId: localAgentId,
      timestamp: now(),
      tags: episode.tags ?? [],
      ...episode,
    } as Episode);
    index += 1;
  };

  append({ kind: "run_start", goal: request.goal, domain: request.domain });

  const safety = classifyGoalSafety(request.goal, request.destructiveConfirmed ?? false);
  if (safety.kind === "refuse") {
    append({ kind: "refusal", reason: safety.reason, category: safety.category });
    append({ kind: "run_end", success: false, score: 0 });
    const refusedRun = request.tools.runs.get(id);
    if (refusedRun !== undefined) {
      request.tools.runs.update({ ...refusedRun, endedAt: now(), success: false, score: 0, notes: safety.reason });
    }
    return { runId: id, success: false };
  }

  if (safety.kind === "confirm_destructive") {
    append({ kind: "recovery", decision: "escalate", reason: safety.reason });
    append({ kind: "run_end", success: false, score: 0 });
    const heldRun = request.tools.runs.get(id);
    if (heldRun !== undefined) {
      request.tools.runs.update({ ...heldRun, endedAt: now(), success: false, score: 0, notes: safety.reason });
    }
    return { runId: id, success: false };
  }

  const worldResults = preloadHabitualSkills(
    request.tools.skills.habitual(request.domain),
    request.tools.world.search({ domain: request.domain, query: request.goal }),
  );
  const attentionRequest = {
    worldResults,
    tools: ["local-provider.execute"],
    episodes: request.tools.episodes.list(id),
  };
  const attention = applyAttentionLimits({
    ...attentionRequest,
    limits: request.attentionLimits ?? request.tools.attention.status().limits,
  });
  append({
    kind: "plan",
    ...(await runPlanPrimitive({
      goal: request.goal,
      provider: request.provider,
      context: attention,
    })),
  });

  const prediction = await runPredictPrimitive({
    goal: request.goal,
    provider: request.provider,
    tool: "local-provider.execute",
  });
  append({ kind: "prediction", ...prediction });

  const executeRequest = {
    goal: request.goal,
    provider: request.provider,
    tool: "local-provider.execute",
  };
  const execution = await runExecutePrimitive(
    request.forceFailure === undefined ? executeRequest : { ...executeRequest, forceFailure: request.forceFailure },
  );

  append({ kind: "action", ...execution.action });
  append({ kind: "observation", content: execution.observation });

  if (request.forceFailure === true) {
    const monitor = runMonitorPrimitive({ observation: execution.observation, forceFailure: request.forceFailure });
    append({ kind: "monitor_signal", ...monitor });
    append({
      kind: "recovery",
      ...(await runRecoverPrimitive({ goal: request.goal, provider: request.provider, signal: monitor })),
    });
    append({ kind: "run_end", success: false, score: 0 });
    const failedRun = request.tools.runs.get(id);
    if (failedRun !== undefined) {
      request.tools.runs.update({ ...failedRun, endedAt: now(), success: false, score: 0, notes: "Recovered from forced failure" });
    }
    return { runId: id, success: false };
  }

  const validation = await runValidatePrimitive({ output: execution.observation, provider: request.provider });
  append({ kind: "validation", ...validation });
  request.tools.confidence.record(prediction.prediction.confidence, true);
  request.tools.curriculum.advance(request.domain, 0);

  const reflectionRequest =
    request.surprises === undefined
      ? { validationScore: validation.score }
      : { validationScore: validation.score, surprises: request.surprises };
  const reflection = runReflectPrimitive(reflectionRequest);
  append({ kind: "reflection", ...reflection });
  append({ kind: "run_end", success: true, score: 0.8 });

  const run = request.tools.runs.get(id);
  if (run !== undefined) {
    const completedRun = {
      ...run,
      endedAt: now(),
      success: true,
      score: 0.8,
      notes: "Completed local runtime slice",
      publishable: reflection.reflection.publishable,
    };
    request.tools.runs.update(completedRun);
    if (reflection.reflection.publishable) {
      request.tools.publishables.queue({
        kind: "run",
        path: `runs/${String(id)}`,
        body: anonymizeText(JSON.stringify({ run: completedRun, reflection: reflection.reflection }, null, 2)),
      });
    }
  }

  return { runId: id, success: true };
}
