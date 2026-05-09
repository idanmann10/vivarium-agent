import type { AgentId, RunId } from "../ids.js";
import type { Visibility } from "./skill.js";

export interface Run {
  readonly id: RunId;
  readonly agentId: AgentId;
  readonly domain: string;
  readonly goal: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly success: boolean | null;
  readonly score: number | null;
  readonly notes: string;
  readonly publishable: boolean;
  readonly published: boolean;
  readonly publishedAt: string | null;
  readonly visibility: Visibility;
}
