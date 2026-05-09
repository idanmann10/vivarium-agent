import {
  agentId,
  episodeId,
  runId,
  type Episode,
  type RunId,
} from "../../core/src/index.js";
import type { LocalProvider } from "../../providers/src/index.js";
import type { SelfTools } from "../../tools/src/index.js";
import { applyAttentionLimits, type AttentionLimits } from "./attention.js";
import { runExecutePrimitive } from "./primitives/execute/index.js";
import { runMonitorPrimitive } from "./primitives/monitor/index.js";
import { runPlanPrimitive } from "./primitives/plan/index.js";
import { runPredictPrimitive } from "./primitives/predict/index.js";
import { runRecoverPrimitive } from "./primitives/recover/index.js";
import { runReflectPrimitive } from "./primitives/reflect/index.js";
import { runValidatePrimitive } from "./primitives/validate/index.js";

export const runSkeleton = ["plan", "predict", "execute", "monitor", "recover", "validate", "reflect"] as const;

export interface RunGoalRequest {
  readonly goal: string;
  readonly domain: string;
  readonly agentName: string;
  readonly provider: LocalProvider;
  readonly tools: SelfTools;
  readonly forceFailure?: boolean;
  readonly attentionLimits?: AttentionLimits;
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

  const worldResults = request.tools.world.search({ domain: request.domain, query: request.goal });
  const attentionRequest = {
    worldResults,
    tools: ["local-provider.execute"],
    episodes: request.tools.episodes.list(id),
  };
  const attention = applyAttentionLimits(
    request.attentionLimits === undefined ? attentionRequest : { ...attentionRequest, limits: request.attentionLimits },
  );
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

  append({ kind: "reflection", ...runReflectPrimitive({ validationScore: validation.score }) });
  append({ kind: "run_end", success: true, score: 0.8 });

  const run = request.tools.runs.get(id);
  if (run !== undefined) {
    request.tools.runs.update({ ...run, endedAt: now(), success: true, score: 0.8, notes: "Completed local runtime slice" });
  }

  return { runId: id, success: true };
}
