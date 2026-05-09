# Tools Credentials Dispatch Design

## Goal

Replace the placeholder tools dispatcher and credential resolver with a typed local implementation that can safely route external tools, resolve credentials, and emit auditable dispatch events.

## Scope

- Add a credential store interface plus memory and encrypted file-backed implementations.
- Add typed external tool requests for HTTP, file, terminal, code, and MCP-style calls.
- Route external tool calls through one dispatcher surface.
- Apply HTTP safety checks before generic HTTP calls.
- Inject credentials into HTTP requests when a tool call asks for a stored credential.
- Emit dispatch events so future runtime integration can append tool-call episodes.

## Non-Goals

- No live OAuth flow.
- No OS keychain integration.
- No real Docker/E2B sandbox runner; terminal and code execution are dependency-injected.
- No broad CLI credential UX yet.

## Architecture

`packages/tools/src/credentials/store.ts` owns credential persistence. The encrypted file store serializes credential records as JSON encrypted with AES-256-GCM using a caller-provided master key, which keeps tests deterministic and avoids adding dependencies.

`packages/tools/src/external/index.ts` owns external tool request types and routing. Real I/O stays behind adapters: `fetch`, terminal runner, code runner, MCP caller, and an allowlisted file adapter.

`packages/tools/src/dispatcher.ts` becomes the single entry point. It accepts optional builtin handlers, a credential store, HTTP safety config, external adapters, and an audit callback. It returns structured results instead of opaque strings.

## Testing

- Credential tests prove encrypted persistence round-trips and the file does not contain plaintext secrets.
- External/dispatcher tests prove HTTP credentials are injected, destructive HTTP calls are blocked without confirmation, dispatch events are emitted, and file/terminal/code/MCP calls route through adapters.
