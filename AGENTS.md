# Agent Repo Guidance

`goal.md` in the parent workspace is the roadmap. Build phases in order and do not begin a later phase until the prior phase's done criteria are met.

Package boundaries:

- `packages/core`: types, kernel, and pure math only. No I/O.
- `packages/state`: local persistence and memory.
- `packages/runtime`: primitive registry, modes, orchestrator, attention.
- `packages/tools`: self-tools, external tools, credentials, anonymizer, safety.
- `packages/providers`: model adapters and routing.
- `packages/world`: git/GitHub world access, retrieval, contribution paths.
- `packages/eval`: benchmarks and compounding evaluation.

Conventions:

- TypeScript ESM only, `.js` extensions in imports.
- No `any`; use `unknown` and narrow.
- Prefer discriminated unions and readonly shapes.
- Keep side effects out of `core`.
- Unit-test math and ID factories before implementation changes.
