---
title: Add a Skill
description: Local skill authoring.
when_to_read: When implementing procedural memory.
---

# Add a Skill

Skills use frontmatter plus a focused body and optional references.

## File

World skills live as `SKILL.md` files under a domain directory. Local procedural
memory stores the same shape after pull or promotion.

Required frontmatter should name the skill, domain, status, visibility,
contributor, and operational constraints. Use `requiredToolsets` for tool
families such as `terminal` or `computer-use`; use `requiredCredentials` for
named API or service requirements. Generated proposals should include
`evidenceRunIds` so reviewers can inspect the runs that justify the skill.

## Body

Keep the body procedural: when to use it, prerequisites, steps, failure modes,
and validation. Put a short provenance section at the end explaining where the
skill came from and what evidence supports it.

## Acceptance

Promoted skills earn trust through use, Wilson lower bounds, and regression
history. Do not mark a skill habitual by hand; Dream and the habituation gate
derive that from repeated successful use.
