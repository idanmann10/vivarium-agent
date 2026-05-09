# Web External Tools Design

## Goal

Add explicit `web.fetch`, `web.read`, and `web.search` support to the external tool router so the `web` toolset is more than a declared name.

## Scope

- Add typed web request variants to `ExternalToolRequest`.
- Route `web.fetch` through the injected fetch adapter with GET.
- Route `web.read` through injected fetch and return plain-ish text extracted from HTML.
- Route `web.search` through an injected search adapter.
- Extend dispatcher parsing for the new web tool names.

## Non-Goals

- No live browser automation.
- No remote search provider dependency.
- No readability library.

## Testing

Focused tests verify `web.fetch`, `web.read`, and `web.search` route through injected adapters and return structured results.
