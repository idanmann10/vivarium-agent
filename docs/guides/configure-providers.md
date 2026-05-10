---
title: Configure Providers
description: Provider profile setup.
when_to_read: When wiring model adapters.
---

# Configure Providers

Provider configs refer to environment variable names for keys.

The v1 live-readiness path expects all three provider targets from `goal.md` to be configured:

```bash
export ANTHROPIC_API_KEY=<redacted>
export OPENROUTER_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_BASE_URL=<private-oai-compatible-base-url>
export VIVARIUM_OAI_COMPAT_MODEL=<private-fine-tune-model>
export VIVARIUM_PROVIDER_PROFILES_PATH=~/.the-agent/provider-profiles.json
export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE=anthropic-main
export VIVARIUM_OPENROUTER_PROVIDER_PROFILE=openrouter
export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE=private-finetune
```

Save named profiles locally:

```bash
bun apps/cli/src/index.ts providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE" \
  --kind anthropic \
  --api-key-env ANTHROPIC_API_KEY \
  --model <anthropic-model> \
  --capability chat \
  --capability tools \
  --context-window 200000 \
  --cost-class expensive

bun apps/cli/src/index.ts providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <openrouter-model> \
  --base-url <openrouter-base-url> \
  --capability chat \
  --capability json_mode \
  --context-window 128000 \
  --cost-class medium

bun apps/cli/src/index.ts providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env VIVARIUM_OAI_COMPAT_API_KEY \
  --model "$VIVARIUM_OAI_COMPAT_MODEL" \
  --base-url "$VIVARIUM_OAI_COMPAT_BASE_URL" \
  --capability chat \
  --capability json_mode \
  --context-window <context-window> \
  --cost-class medium
```

`doctor --live` reports `provider.profilesPath:unavailable` until the file at
`VIVARIUM_PROVIDER_PROFILES_PATH` exists. It reports a provider profile as unavailable when the
matching `VIVARIUM_*_PROVIDER_PROFILE` value is not present in that file.

List configured profiles:

```bash
bun apps/cli/src/index.ts providers list \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH"
```

Smoke a profile without repeating model details:

```bash
bun apps/cli/src/index.ts providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```

Run a goal through a profile:

```bash
bun apps/cli/src/index.ts run \
  --goal "<small real goal>" \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```
