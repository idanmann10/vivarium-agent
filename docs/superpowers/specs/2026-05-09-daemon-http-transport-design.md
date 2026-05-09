# Daemon HTTP Transport Design

## Goal

Expose the existing daemon server through a small local HTTP transport with explicit lifecycle control, so runtime clients can call status, run, and dream operations without importing process-local objects.

## Scope

- Add an HTTP fetch handler for the current `DaemonServer` interface.
- Add a Bun server lifecycle wrapper that starts on a configured host/port and can stop cleanly.
- Keep runtime behavior unchanged: the transport delegates to `status`, `run`, and `dream`.
- Keep the transport local and dependency-free; authentication, TLS, process managers, and remote deployment are outside this slice.

## API

- `GET /status` returns daemon status JSON.
- `POST /run` accepts `{ "goal": string, "domain": string }` and returns the `runGoal` result.
- `POST /dream` accepts a domain-stats object and returns the `runDream` result.
- Unknown paths return 404 JSON.
- Unsupported methods return 405 JSON.
- Invalid JSON or invalid request shapes return 400 JSON.

## Architecture

`apps/daemon/src/http-transport.ts` owns HTTP-specific concerns: parsing, validation, response formatting, routing, and Bun server lifecycle. `apps/daemon/src/server.ts` remains the runtime facade and does not learn about HTTP. `apps/daemon/src/index.ts` exports the transport API.

## Testing

Transport tests use the fetch handler directly for routing and validation, then start a real Bun server on a preallocated loopback port to verify lifecycle and network requests. Bun 1.3.11 in this environment does not support `port: 0`, so the test allocates an available port before calling `Bun.serve`. Existing daemon server tests continue to cover runtime behavior.
