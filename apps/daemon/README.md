# Daemon App

Long-running runtime host for the local agent.

The daemon owns:

- An in-process runtime server with `status`, `run`, and `dream` handlers.
- A Bun HTTP transport exposing `GET /status`, `POST /run`, and `POST /dream`.
- A nightly Dream scheduler helper with deterministic tests.
- An MCP-style tool manifest for `run_goal`, `dream`, and `status`.

Run it locally:

```bash
bun apps/daemon/src/main.ts
```

The default listener is `http://127.0.0.1:8787`. Override it with `VIVARIUM_DAEMON_HOST`,
`VIVARIUM_DAEMON_PORT`, `VIVARIUM_WORLD_ROOT`, and `VIVARIUM_STATE_PATH`. When
`VIVARIUM_STATE_PATH` is omitted, the daemon uses `$HOME/.vivarium/state.db` if
`HOME` is available; otherwise it falls back to in-memory state.

Docker Compose supervision is documented in `docs/guides/deploy-local-compose.md`.
