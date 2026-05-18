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
- `commandPrefix`: optional `terminal.run` argument prefix, such as
  `["git", "status"]`. Prefix policies only apply to simple terminal command
  segments.
- `action`: one of `approve`, `require_confirmation`, or `block`.
- `priority`: optional number. Lower values win. If omitted, array position is
  used as the policy rank.
- `reason`: optional human-readable audit reason.

Policy resolution returns one effective rule. Matching candidates are ordered by
rank, then by `id` for stable ties. If nothing matches, the dispatcher uses
`toolPolicyDefaultAction`, which defaults to `approve`.

For `terminal.run`, command-prefix policies use Executor-style shell handling:
the command is split at shell control operators such as `&&`, `||`, `;`, and
`|`, and every resulting segment must satisfy policy. A command is only as
allowed as its most restrictive segment, so `git status && rm -rf build` can be
approved for the `git status` segment and still blocked or held for the `rm`
segment. Prefix matching is intentionally conservative; redirection, subshells,
command substitution, leading environment assignments, background execution, and
unquoted wildcard expansion are not matched by `commandPrefix` rules and fall
back to general `terminal.run` policies or the default action.

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
      id: "allow-git-status",
      pattern: "terminal.run",
      commandPrefix: ["git", "status"],
      action: "approve",
      priority: 20,
      reason: "Read-only repository status is safe for this run",
    },
    {
      id: "confirm-rm",
      pattern: "terminal.run",
      commandPrefix: ["rm"],
      action: "require_confirmation",
      priority: 30,
      reason: "File removal needs explicit operator approval",
    },
  ],
  toolPolicyDefaultAction: "block",
});
```
