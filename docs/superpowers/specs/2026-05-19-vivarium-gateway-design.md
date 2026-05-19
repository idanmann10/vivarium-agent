# Vivarium Gateway Dashboard Design

## Goal

Turn the daemon root page at `http://127.0.0.1:8787/` from a basic status page into a polished local gateway for building a simple agent end to end.

## Scope

This is a daemon-served gateway, not a new Next.js application. It should feel like a modern dashboard with chat, agents, and world state, while preserving the zero-extra-runtime Mac install path.

## User Experience

- The page title and primary screen name are `Vivarium Gateway`.
- The first viewport is a dense app interface with top-level status, chat, agent roster, world telemetry, latest run, and a live world scene.
- The chat panel is the main action surface. Submitting a goal posts to `/run`, appends user and agent messages, and keeps the existing local deterministic provider path.
- The agent roster shows local runtime roles such as Local Agent, Dream Worker, World Scout, and Safety Sentinel.
- The world section shows memory, runs, confidence, latest run, and available daemon endpoints.
- The visual world scene is a canvas animation with an isometric/grid feel, moving agent markers, and status overlays. It must be nonblank without external assets.

## Architecture

Keep implementation inside `apps/daemon/src/http-transport.ts` for this slice. The daemon already owns `/`, `/status`, `/run`, and `/dream`; the gateway should reuse those endpoints and avoid introducing build tooling or dependencies.

The HTML remains server-rendered, with embedded CSS and small browser JavaScript. Runtime data that is already available through `daemon.status()` is rendered into the initial HTML. Browser JavaScript handles chat submission and canvas animation.

## Testing

- Extend `apps/daemon/src/http-transport.test.ts` so the daemon root must include the gateway sections, chat form, agent roster, world scene canvas, latest-run summary, and `/run` wiring.
- Keep existing route and transport tests green.
- Verify with the browser against the installed daemon after implementation.

## Non-Goals

- Do not add a separate Next.js app in this slice.
- Do not add WebGL or external game engines yet.
- Do not require live provider credentials for the gateway to work.
- Do not remove the existing `/status`, `/run`, or `/dream` API behavior.
