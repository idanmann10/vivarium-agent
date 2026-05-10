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
