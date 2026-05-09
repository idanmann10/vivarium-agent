# Daemon Service Slice Design

## Context

The roadmap includes a long-running daemon, scheduler, and MCP server. The current files are placeholders. Live process supervision and a real MCP transport can wait, but the local service behavior can be made concrete and tested now.

## Approach

Add a deterministic daemon service layer:

- `scheduler.ts` exposes `shouldRunDream` for the default nightly Dream cadence.
- `server.ts` creates a local daemon with state, provider, world reader, and handlers for `run`, `dream`, and `status`.
- `mcp-server.ts` exposes an MCP-style manifest describing the daemon tools without opening a socket.

This keeps process and transport concerns separate from runtime behavior.

## Success Criteria

- Scheduler tests prove Dream triggers after the configured daily hour and does not retrigger before a day elapses.
- Server tests prove `run`, `dream`, and `status` handlers call the runtime and update state.
- MCP tests prove tool manifest contains `run_goal`, `dream`, and `status`.
- Full `the-agent` gates pass.
