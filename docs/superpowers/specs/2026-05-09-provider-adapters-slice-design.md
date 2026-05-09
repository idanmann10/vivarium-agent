# Provider Adapters Slice Design

## Context

The roadmap requires Anthropic, OpenAI, OpenAI-compatible providers, and capability-aware routing. The current implementation has a deterministic local provider only. Live provider calls cannot be verified without credentials, but the HTTP adapters and configuration contract can be implemented and tested with injected fetch functions.

## Approach

Add provider adapters that share the same `complete(request)` surface used by the runtime:

- `createOpenAIProvider` calls `/v1/chat/completions`.
- `createOpenAICompatProvider` uses the same adapter with caller-provided `baseUrl`.
- `createAnthropicProvider` calls `/v1/messages`.
- Each adapter accepts an explicit API key, model, capabilities, cost class, and injectable `fetch`.
- Tests use fake fetch implementations and assert URL, headers, request body, and parsed text.

## Non-Goals

- No live network tests.
- No SDK dependency in this slice.
- No credential prompt UX.

## Success Criteria

- Adapter tests prove request shapes and response parsing for OpenAI-compatible and Anthropic APIs.
- Router continues to work with local and HTTP providers.
- Full `the-agent` gates pass.
