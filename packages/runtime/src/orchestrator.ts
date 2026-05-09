import {
  agentId,
  episodeId,
  runId,
  type Episode,
  type Reflection,
  type RunId,
} from "../../core/src/index.js";
import type { LocalProvider } from "../../providers/src/index.js";
import type { SelfTools } from "../../tools/src/index.js";

export const runSkeleton = ["plan", "predict", "execute", "monitor", "recover", "validate", "reflect"] as const;

export interface RunGoalRequest {
  readonly goal: string;
  readonly domain: string;
  readonly agentName: string;
  readonly provider: LocalProvider;
  readonly tools: SelfTools;
  readonly forceFailure?: boolean;
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
  const plan = await request.provider.complete({ kind: "plan", input: request.goal });
  append({
    kind: "plan",
    plan: `${plan}\nLoaded: ${worldResults.map((result) => result.title).join(", ")}`,
    skillsLoaded: [],
    tracesLoaded: [],
  });

  const prediction = {
    about: "local-runtime",
    expected: await request.provider.complete({ kind: "predict", input: request.goal }),
    confidence: 0.72,
  };
  append({ kind: "prediction", prediction });

  append({ kind: "action", tool: "local-provider.execute", args: { goal: request.goal } });

  const observation = request.forceFailure
    ? "Forced failure for recovery test"
    : await request.provider.complete({ kind: "execute", input: request.goal });
  append({ kind: "observation", content: observation });

  if (request.forceFailure === true) {
    append({ kind: "monitor_signal", offTrackScore: 0.9, reasons: ["forced failure"] });
    append({ kind: "recovery", decision: "replan", reason: await request.provider.complete({ kind: "recover", input: request.goal }) });
    append({ kind: "run_end", success: false, score: 0 });
    const failedRun = request.tools.runs.get(id);
    if (failedRun !== undefined) {
      request.tools.runs.update({ ...failedRun, endedAt: now(), success: false, score: 0, notes: "Recovered from forced failure" });
    }
    return { runId: id, success: false };
  }

  const validation = await request.provider.complete({ kind: "validate", input: observation });
  append({ kind: "validation", score: 0.8, passed: true, reasons: [validation] });
  request.tools.confidence.record(prediction.confidence, true);
  request.tools.curriculum.advance(request.domain, 0);

  const reflection: Reflection = {
    worked: ["local deterministic runtime completed"],
    didntWork: [],
    surprises: [],
    skillCandidates: [],
    skillRefinements: [],
    skillPrunings: [],
    antiPatternCandidates: [],
    scaffoldingGaps: [],
    publishable: false,
  };
  append({ kind: "reflection", reflection });
  append({ kind: "run_end", success: true, score: 0.8 });

  const run = request.tools.runs.get(id);
  if (run !== undefined) {
    request.tools.runs.update({ ...run, endedAt: now(), success: true, score: 0.8, notes: "Completed local runtime slice" });
  }

  return { runId: id, success: true };
}
