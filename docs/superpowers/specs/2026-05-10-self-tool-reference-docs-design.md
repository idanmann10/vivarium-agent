# Self-Tool Reference Docs Design

## Goal

Keep reference documentation aligned with the current top-level self-tool surface.

## Scope

- Require reference docs for the `identity` and `attention` self-tool groups.
- Require named method documentation for curriculum, identity, and attention tools.
- Add the missing identity reference page.
- Update curriculum and attention reference pages with the implemented method names.

## Non-Goals

- No generated documentation pipeline.
- No CLI help output changes.
- No broad rewrite of existing reference pages.

## Testing

`scripts/reference-docs.test.ts` now checks that every top-level self-tool group has a reference page and that curriculum, identity, and attention pages contain the roadmap method names.
