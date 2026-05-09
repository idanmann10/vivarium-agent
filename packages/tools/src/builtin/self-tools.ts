import type { RunId } from "../../../core/src/ids.js";
import type { Episode, Run } from "../../../core/src/index.js";
import type { InMemoryStateRepository } from "../../../state/src/index.js";
import type { LocalWorldReader, LocalWorldSearchRequest, LocalWorldSearchResult } from "../../../world/src/index.js";

export interface SelfToolsDependencies {
  readonly state: InMemoryStateRepository;
  readonly world: LocalWorldReader;
}

export interface SelfTools {
  readonly runs: {
    create(run: Run): void;
    get(id: RunId): Run | undefined;
    update(run: Run): void;
  };
  readonly episodes: {
    append(episode: Episode): void;
    list(runId: RunId): readonly Episode[];
  };
  readonly world: {
    search(request: LocalWorldSearchRequest): readonly LocalWorldSearchResult[];
  };
  readonly curriculum: {
    advance(domain: string, stepIndex: number): void;
  };
  readonly confidence: {
    record(confidence: number, correct: boolean): void;
  };
}

export function createSelfTools({ state, world }: SelfToolsDependencies): SelfTools {
  return {
    runs: {
      create(run) {
        state.createRun(run);
      },
      get(id) {
        return state.getRun(id);
      },
      update(run) {
        state.updateRun(run);
      },
    },
    episodes: {
      append(episode) {
        state.appendEpisode(episode);
      },
      list(runId) {
        return state.listEpisodes(runId);
      },
    },
    world: {
      search(request) {
        return world.search(request);
      },
    },
    curriculum: {
      advance(domain, stepIndex) {
        state.advanceCurriculum(domain, stepIndex);
      },
    },
    confidence: {
      record(confidence, correct) {
        state.recordPredictionOutcome({ confidence, correct });
      },
    },
  };
}
