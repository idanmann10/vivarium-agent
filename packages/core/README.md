# Core Package

Types, kernel, and pure math. This package has no I/O and no runtime dependencies beyond the TypeScript standard library.

`packages/core` is the inward dependency for the monorepo. It owns shared types,
branded IDs, the `kernel`, result helpers, episode shapes, and pure math such as
Wilson lower bounds, retrieval scoring, trust, stage scoring, surprise
magnitude, and decision thresholds.

Keep this package deterministic. It should have no I/O: no filesystem, network,
process, database, provider, or clock-dependent behavior unless the value is
passed in by the caller.

Add tests with every new type contract or formula. A runtime feature may depend
on core types and formulas, but core must never depend on runtime, tools, state,
providers, world, or apps.
