# Attention Token Budget Design

## Goal

Close the local Phase 1 attention gap by making `applyAttentionLimits` account for and enforce the configured working-token budget.

## Scope

- Estimate token cost deterministically from selected context payloads.
- Apply the token budget after existing count limits for skills, traces, tools, and episodes.
- Return budget metadata with the selected context.
- Keep existing count-limit behavior stable when the budget is large enough.

## Non-Goals

- No tokenizer dependency.
- No model-specific token accounting.
- No provider prompt packing changes.

## Testing

Attention tests verify the existing count caps and a low-budget case where selection is truncated, `estimatedTokens` stays within `maxWorkingTokens`, and budget metadata is returned.
