import type { Identity } from "../../../core/src/index.js";
import type { StateRepository } from "../repository.js";

export interface IdentityMemoryConfig {
  readonly keepHistory: boolean;
}

export interface IdentityMemory {
  set(identity: Identity): void;
  get(): Identity | undefined;
  summarize(): string;
}

export function createIdentityMemory(state: StateRepository): IdentityMemory {
  return {
    set(identity) {
      state.setIdentity(identity);
    },
    get() {
      return state.getIdentity();
    },
    summarize() {
      return state.getIdentity()?.summary ?? "No identity summary recorded yet.";
    },
  };
}
