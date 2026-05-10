---
title: Add a Primitive
description: How to add a runtime primitive.
when_to_read: When extending the primitive registry.
---

# Add a Primitive

Create a directory under `packages/runtime/src/primitives/<name>/` with `primitive.ts`, `meta.ts`, and `index.ts`, then register it.

## Files

Use the existing primitive directories as the template:

- `packages/runtime/src/primitives/<name>/primitive.ts` owns the runtime behavior.
- `packages/runtime/src/primitives/<name>/meta.ts` exports the primitive metadata.
- `packages/runtime/src/primitives/<name>/index.ts` re-exports the public module.
- `packages/runtime/src/primitives/registry.ts` adds the new metadata to the registry.

## Tests

Add or update tests before wiring behavior. Registry changes belong in
`packages/runtime/src/primitives/registry.test.ts`. Behavior belongs in the
closest primitive or lifecycle tests, and should assert the episode payload or
control-flow decision the primitive returns.

## Rules

Keep primitives small and runtime-owned. Learned procedures belong in skills; a
primitive belongs in code only when every agent needs the operation before it has
learned anything from the world.
