import type { Episode } from "./episode.js";
import type { Skill } from "./skill.js";

export interface WorkingMemory {
  readonly episodes: readonly Episode[];
  readonly selectedSkills: readonly Skill[];
  readonly tokenEstimate: number;
}

export interface SemanticFact {
  readonly subject: string;
  readonly fact: string;
  readonly confidence: number;
  readonly derivedFromEpisodeIds: readonly string[];
}
