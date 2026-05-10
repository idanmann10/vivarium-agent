# Attention Self-Tools Design

## Goal

Implement the roadmap's `attention.focus`, `attention.defocus`, and `attention.status` self-tools and make focused limits affect planning.

## Scope

- Add an `attention` group to `SelfTools`.
- Track default and focused attention caps in the local self-tools instance.
- Report current focused state, caps, and usage fields through `attention.status`.
- Use focused caps in `runGoal` unless explicit run-level attention limits are supplied.

## Non-Goals

- No persistent storage for temporary focus state.
- No model-side automatic focus decisions.
- No changes to the attention budget estimator.

## Testing

Self-tool tests verify focus, status, and defocus behavior. Runtime tests verify that a focused skill cap narrows the number of skills loaded into the plan.
