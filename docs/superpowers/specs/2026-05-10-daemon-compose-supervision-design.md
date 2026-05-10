# Daemon Compose Supervision Design

## Goal

Provide a local Docker Compose supervision path for the daemon, matching the roadmap's v1 boundary of local deployment rather than cloud SaaS.

## Scope

- Add an executable daemon `main.ts` path that starts the existing HTTP transport.
- Parse daemon host, port, and world-root settings from environment variables.
- Add Dockerfile and Compose files for local daemon supervision with a restart policy and healthcheck.
- Add a focused test for daemon main environment parsing.

## Non-Goals

- No cloud deployment.
- No live provider credentials.
- No persistent daemon state migration.

## Test Strategy

- Unit-test environment parsing in `apps/daemon/src/main.test.ts`.
- Verify Docker Compose configuration with `docker compose config`.
- Run full agent lint, typecheck, test, and build gates.
