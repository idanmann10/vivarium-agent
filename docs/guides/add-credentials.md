---
title: Add Credentials
description: Credential registration flow.
when_to_read: When implementing credential prompts.
---

# Add Credentials

Credentials are resolved by name and kind at runtime. For live readiness, start
with the guided setup path instead of exporting raw keys by hand:

```bash
vivarium setup live
vivarium connect signup
```

`vivarium setup live` creates or reuses the private readiness file and the local
secret files under `~/.vivarium`. `vivarium connect signup` shows the internal
credential handoff alongside the provider and GitHub/public release handoffs
without raw env-key wiring. Put the internal API token, credential master key,
and internal health URL in the generated local setup files, then rerun setup.

The default files are:

```bash
~/.vivarium/secrets/credential-master.key
~/.vivarium/secrets/internal-api.token
~/.vivarium/secrets/internal-health-url.txt

vivarium setup live
```

For scripted updates, `vivarium connect fill` remains available with friendly
labels and file-backed inputs.

Review the readiness dashboard, then write the encrypted credential store and
provider profile artifacts:

```bash
vivarium connect
vivarium connect setup --confirm-write
```

Verify dispatch without exposing the secret:

```bash
vivarium connect smoke
```

The smoke response should show status metadata only. If a command prints a
credential value, treat it as a blocking safety bug. `doctor --live` runs the
same smoke probe and reports the internal credential as ready only when the
health endpoint returns a 2xx status through the encrypted credential.

## Low-Level Commands

Use the low-level commands only when debugging or scripting the credential layer
directly. The friendly `connect` commands above are the operator path.

The setup file stores the generated credential store path, local master key,
credential name, credential value, and health URL as internal fields:

```bash
VIVARIUM_CREDENTIALS_PATH
VIVARIUM_CREDENTIALS_MASTER_KEY
VIVARIUM_INTERNAL_API_CREDENTIAL_NAME
VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE
VIVARIUM_INTERNAL_API_HEALTH_URL
```

Add the encrypted record with `credentials add`:

```bash
vivarium credentials add \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" \
  --kind bearer \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --purpose "Call internal API" \
  --value "$VIVARIUM_INTERNAL_API_CREDENTIAL_VALUE"
```

Then verify the direct credential path with `credentials smoke`:

```bash
vivarium credentials smoke \
  --path "$VIVARIUM_CREDENTIALS_PATH" \
  --master-key "$VIVARIUM_CREDENTIALS_MASTER_KEY" \
  --name "$VIVARIUM_INTERNAL_API_CREDENTIAL_NAME" \
  --url "$VIVARIUM_INTERNAL_API_HEALTH_URL" \
  --method GET
```

`doctor --live` reports the encrypted store as unavailable until the file at
`VIVARIUM_CREDENTIALS_PATH` exists.
