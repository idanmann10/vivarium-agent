import type { RunId } from "../../../core/src/ids.js";
import type { Episode } from "../../../core/src/index.js";
import type { StateRepository } from "../repository.js";

export interface EpisodicMemoryConfig {
  readonly appendOnly: true;
}

export interface EpisodicMemory {
  append(episode: Episode): void;
  list(runId: RunId): readonly Episode[];
}

export function createEpisodicMemory(state: StateRepository): EpisodicMemory {
  return {
    append(episode) {
      state.appendEpisode(episode);
    },
    list(runId) {
      return state.listEpisodes(runId);
    },
  };
}
