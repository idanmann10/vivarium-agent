# Tools Package

Self-tools, external tools, credential resolution, anonymization, and safety checks.

`packages/tools` owns `SelfTools`, external tools, the dispatcher, credential
stores/resolution, anonymization, and safety checks. Self-tools read and mutate
agent state. External tools route through adapters so tests can inject web,
HTTP, file, terminal, code, MCP, Anthropic native, and computer-use behavior.

All action should pass through the dispatcher when logging, tool policies,
credentials, anonymization, rate limits, argument scrubbing, or safety checks
matter. Direct adapter calls make audit events and safety surprises easy to skip.
Policy evaluations preserve per-subject decisions, so terminal chains can report
the exact segment that blocked or required confirmation.

Publication paths should anonymize run and trace content before writing proposal
artifacts. Credential-like arguments should be blocked without echoing secrets.
