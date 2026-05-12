---
title: Tool Policies
description: Dispatcher policy rules for approving, confirming, or blocking external tools.
when_to_read: When configuring external tool access for a run or runtime integration.
---

# Tool Policies

Tool policies are evaluated by `createToolDispatcher` after a request parses as
an external tool and before rate limits, credential injection, safety checks, or
adapter dispatch. Builtin self-tools are handled before this gate and are not
affected by external tool policies.

Each `ToolPolicy` has:

- `id`: stable identifier used for deterministic tie-breaking.
- `pattern`: tool match pattern. Supported forms are `*`, exact names like
  `http.request`, and subtree patterns like `computer.*`.
- `action`: one of `approve`, `require_confirmation`, or `block`.
- `priority`: optional number. Lower values win. If omitted, array position is
  used as the policy rank.
- `reason`: optional human-readable audit reason.

Policy resolution returns one effective rule. Matching candidates are ordered by
rank, then by `id` for stable ties. If nothing matches, the dispatcher uses
`toolPolicyDefaultAction`, which defaults to `approve`.

`block` returns a blocked dispatch result before the adapter runs.
`require_confirmation` requires the original dispatch args to include
`confirmed: true`; otherwise the call returns a blocked result. Confirmed calls
continue into the existing rate-limit, credential, HTTP, computer-use, and output
safety checks.

Example:

```ts
createToolDispatcher({
  externalAdapters,
  toolPolicies: [
    {
      id: "confirm-computer",
      pattern: "computer.*",
      action: "require_confirmation",
      priority: 10,
      reason: "Computer-use actions need explicit approval",
    },
    {
      id: "block-http",
      pattern: "http.request",
      action: "block",
      priority: 20,
      reason: "Raw HTTP is disabled for this run",
    },
  ],
});
```
