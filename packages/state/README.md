# State Package

Persistence, storage schema, and memory system implementations.

`packages/state` owns `StateRepository`, the in-memory repository used in tests,
the SQLite repository, migrations, Drizzle schema artifacts, and the five memory
systems: working, episodic, semantic, procedural, and identity.

Add storage changes here when a runtime feature needs a new durable field,
table, or query. Migrations should be idempotent, covered by tests, and mirrored
in repository behavior. The semantic facts table and confidence buckets are part of this
package because Dream and prediction calibration need durable evidence.

Keep repository interfaces stable for runtime and tools. Apps should open state
files and pass repositories in; business logic should not live in the CLI.
