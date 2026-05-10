# Tool Availability Retrieval Design

## Goal

Make conditional skill availability usable from CLI and runtime retrieval, not only from direct local-reader calls.

## Scope

- Add active toolset/tool arrays to multi-world search requests.
- Add active toolset/tool arrays to `world search` command options.
- Add active toolset/tool arrays to `runCommand` and `runGoal`.
- Route repeated CLI flags `--available-toolset` and `--available-tool` into world search and run.
- Preserve the default behavior where optional toolsets are disabled and fallback skills are visible.

## Non-Goals

- No automatic detection of installed tools.
- No new external tool adapters.
- No credential validation for optional toolsets.

## Testing

World command tests verify required skills appear only when matching tool availability is provided. Run command tests verify the plan consults the required skill when web tools are available and the fallback skill when they are not.
