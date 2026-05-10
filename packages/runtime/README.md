# Runtime Package

Primitive registry, modes, orchestrator, and attention budget enforcement.

`packages/runtime` owns the goal loop. The orchestrator sequences Plan, Predict,
Execute, Monitor, Recover, Validate, Reflect, and Dream, applies run-level safety,
loads planning context, and records episodes through self-tools.

Attention selection lives here because it decides which skills, traces, tools,
and recent episodes fit into the current working context. Dream also lives here
as the consolidation primitive that promotes, prunes, habituates, updates
identity, and extracts anti-pattern or trace candidates through state.

Primitives should not call each other directly. Add primitive behavior in the
primitive module, then let the orchestrator decide when it runs.
