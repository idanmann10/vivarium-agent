---
title: Anti-Pattern Format
description: Reference for anti-pattern content.
when_to_read: When validating anti-patterns.
---

# Anti-Pattern Format

The canonical TypeScript shape is `packages/core/src/types/anti-pattern.ts`. Anti-patterns are reusable warnings: they describe a failure mode, explain why it is harmful, and name the replacement behavior.

## AntiPattern

```ts
interface AntiPattern {
  id: AntiPatternId;
  name: string;
  description: string;
  why: string;
  insteadDo: string;
  domain: string;
  visibility: Visibility;
  relatedSkills: readonly SkillId[];
  contributorId: ContributorId;
  createdAt: string;
}
```

`description` names what not to do. `why` records the cost or failure mode. `insteadDo` is the corrective action a future agent should take. `domain` scopes retrieval. `visibility` follows the shared `"public" | "private" | "internal"` model. `relatedSkills` links the warning to the skills it constrains or corrects.

## AntiPatternCandidateProposal

```ts
interface AntiPatternCandidateProposal {
  name: string;
  description: string;
  why: string;
  insteadDo: string;
  evidenceRunIds: readonly string[];
}
```

Dream emits candidate proposals when failed or low-score runs reveal repeatable mistakes. `evidenceRunIds` should point at runs that demonstrate the failure, not just at runs that mention the topic.
