import type { SemanticFactRecord, StateRepository } from "../repository.js";

export interface SemanticMemoryConfig {
  readonly pruneByRelevance: boolean;
}

export interface SemanticMemory {
  write(fact: SemanticFactRecord): void;
  recall(query: string, limit?: number, domain?: string): readonly SemanticFactRecord[];
  list(domain?: string): readonly SemanticFactRecord[];
  forget(id: string): boolean;
}

export function createSemanticMemory(state: StateRepository): SemanticMemory {
  return {
    write(fact) {
      state.upsertSemanticFact(fact);
    },
    recall(query, limit = 5, domain) {
      const needle = query.toLowerCase();
      return state
        .listSemanticFacts(domain)
        .filter((fact) => `${fact.subject} ${fact.fact}`.toLowerCase().includes(needle))
        .slice(0, limit);
    },
    list(domain) {
      return state.listSemanticFacts(domain);
    },
    forget(id) {
      return state.deleteSemanticFact(id);
    },
  };
}
