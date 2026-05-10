# Providers Package

LLM provider adapters and capability-aware routing.

This package owns model adapter contracts for OpenAI, Anthropic,
OpenAI-compatible providers, and the deterministic local provider used in tests.
Adapters expose capabilities, context windows, and cost metadata; routing picks
the cheapest provider that satisfies the requested capability and `costClass`.

Provider profile persistence and command-line smoke wrappers live in `apps/cli`.
The provider package should stay focused on request construction, response
parsing, capability checks, and provider selection.

Tests use injected fetch implementations. Do not read API keys directly here;
callers pass resolved credentials at the edge.
