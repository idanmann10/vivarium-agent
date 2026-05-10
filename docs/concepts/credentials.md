---
title: Credentials
description: Credential requirements are declared by skills and resolved at runtime.
when_to_read: When implementing provider or external tool access.
---

# Credentials

Configs store environment variable names and metadata, not secret values.

Provider profiles and external tools declare credential requirements, then the
runtime resolves them at the edge before dispatch. `apiKeyEnvVar` is the common
provider field because config should identify where a key lives, not contain the
key itself.

## Storage

The local credential store writes encrypted AES-GCM records for bearer tokens,
`oauth` credentials, and `service_account` metadata. Tests verify that stored
files do not contain plaintext secrets, and callers receive only the resolved
headers or request metadata they need.

## Smoke Path

`credentials smoke` is the live handoff check for an internal API credential. It
loads a named encrypted record, injects it into an allowlisted HTTP request, and
returns request health without echoing the secret value.
