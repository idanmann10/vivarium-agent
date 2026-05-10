---
title: Skill Format
description: Reference for skill metadata and body.
when_to_read: When validating skill content.
---

# Skill Format

The canonical TypeScript shape is `packages/core/src/types/skill.ts`. A `Skill` is procedural memory: a reusable instruction or code-backed behavior that can be retrieved, evaluated, promoted, deprecated, archived, and eventually habituated.

## Skill

```ts
interface Skill {
  id: SkillId;
  name: string;
  description: string;
  kind: SkillKind;
  body: string;
  domains: readonly string[];
  status: SkillStatus;
  visibility: Visibility;
  version: number;
  parentSkillId: SkillId | null;
  competesWith: readonly SkillId[];
  inspiredBy: readonly string[];
  worldRef: WorldRef | null;
  contributorId: ContributorId | null;
  requiredCredentials: readonly CredentialRequirement[];
  requiredToolsets: readonly string[];
  createdAt: string;
  lastUsedAt: string | null;
  lastValidatedAt: string | null;
  timesUsed: number;
  timesHelped: number;
  habitual: boolean;
}
```

`SkillKind` is `"prompt"` or `"code"`. `SkillStatus` is `"candidate"`, `"promoted"`, `"deprecated"`, or `"archived"`. `Visibility` is `"public"`, `"private"`, or `"internal"`. `body` is the actual instruction or implementation content. `domains` drive retrieval. `requiredCredentials` and `requiredToolsets` let retrieval hide skills the current run cannot safely execute. `habitual` means the skill is loaded before normal retrieval-selected skills.

Lineage fields preserve context: `parentSkillId` links revisions, `competesWith` names alternatives, `inspiredBy` can point to URLs or prior artifacts, and `worldRef` records where the skill came from.

## SkillCandidateProposal

```ts
interface SkillCandidateProposal {
  name: string;
  description: string;
  body: string;
  evidenceRunIds: readonly string[];
}
```

Candidates are not promoted by existence alone. Promotion and world push decisions depend on usage, Wilson lower bound, coverage, and cross-validated evidence.

## SkillRefinement

```ts
interface SkillRefinement {
  skillId: SkillId;
  proposedBody: string;
  reason: string;
}
```

Refinements are proposed edits to existing skills. Keep the `reason` specific enough for reviewers to judge whether the change addresses observed evidence.
