# Conditional Skill Availability Design

## Goal

Make local world skill retrieval honor the roadmap's conditional availability frontmatter.

## Scope

- Support `requires_toolsets` and `requires_tools` on skill files.
- Support `fallback_for_toolsets` and `fallback_for_tools` on skill files.
- Keep non-skill artifacts unaffected.
- Preserve existing callers by making availability fields optional.

## Non-Goals

- No full YAML parser.
- No dynamic provider/tool discovery.
- No ranking changes beyond filtering unavailable skills.

## Testing

Local reader tests create a paid web skill and a DuckDuckGo fallback skill. With no active web tools, only the fallback appears. With `web` and `web.search` active, only the paid web skill appears.
