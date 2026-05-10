---
title: Add Credentials
description: Credential registration flow.
when_to_read: When implementing credential prompts.
---

# Add Credentials

Credentials are resolved by name and kind at runtime.

For v1 live readiness, record the internal API credential metadata in env vars before running
`doctor --live`:

```bash
export VIVARIUM_CREDENTIALS_PATH=/tmp/vivarium-credentials.enc
export VIVARIUM_INTERNAL_API_CREDENTIAL_NAME=INTERNAL_API_TOKEN
export VIVARIUM_INTERNAL_API_HEALTH_URL=<internal-health-url>
```

Keep the master key and credential value out of committed files.

`doctor --live` reports `credentials.path:unavailable` until the encrypted file at
`VIVARIUM_CREDENTIALS_PATH` exists.

Add the encrypted record with `credentials add`:

```bash
bun apps/cli/src/index.ts credentials add \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key <local-master-key> \
  --kind bearer \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --purpose "Call internal API" \
  --value <redacted>
```

Then verify dispatch without exposing the secret:

```bash
bun apps/cli/src/index.ts credentials smoke \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key <local-master-key> \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --url "$VIVARIUM_INTERNAL_API_HEALTH_URL" \
  --method GET
```

The smoke response should show status metadata only. If the command prints a
credential value, treat it as a blocking safety bug.
