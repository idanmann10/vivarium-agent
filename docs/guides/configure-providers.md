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
export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW=<private-context-window>
export VIVARIUM_PROVIDER_PROFILES_PATH=~/.the-agent/provider-profiles.json
export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE=anthropic-main
export VIVARIUM_ANTHROPIC_MODEL=<anthropic-model>
export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW=<anthropic-context-window>
export VIVARIUM_OPENROUTER_PROVIDER_PROFILE=openrouter
export VIVARIUM_OPENROUTER_MODEL=<openrouter-model>
export VIVARIUM_OPENROUTER_BASE_URL=<openrouter-base-url>
export VIVARIUM_OPENROUTER_CONTEXT_WINDOW=<openrouter-context-window>
export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE=private-finetune
```

Create all v1 profiles from `live-readiness.local.env` with the guarded setup command:

```bash
vivarium live setup \
  --env-file live-readiness.local.env \
  --confirm-write
```

Save named profiles locally for Anthropic, OpenRouter, and the private
OpenAI-compatible target:

```bash
vivarium providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE" \
  --kind anthropic \
  --api-key-env ANTHROPIC_API_KEY \
  --model "$VIVARIUM_ANTHROPIC_MODEL" \
  --capability chat \
  --capability tools \
  --context-window "$VIVARIUM_ANTHROPIC_CONTEXT_WINDOW" \
  --cost-class expensive

vivarium providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model "$VIVARIUM_OPENROUTER_MODEL" \
  --base-url "$VIVARIUM_OPENROUTER_BASE_URL" \
  --capability chat \
  --capability json_mode \
  --context-window "$VIVARIUM_OPENROUTER_CONTEXT_WINDOW" \
  --cost-class medium

vivarium providers configure \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --name "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE" \
  --kind openai-compat \
  --api-key-env VIVARIUM_OAI_COMPAT_API_KEY \
  --model "$VIVARIUM_OAI_COMPAT_MODEL" \
  --base-url "$VIVARIUM_OAI_COMPAT_BASE_URL" \
  --capability chat \
  --capability json_mode \
  --context-window "$VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW" \
  --cost-class medium
```

`doctor --live` reports `provider.profilesPath:unavailable` until the file at
`VIVARIUM_PROVIDER_PROFILES_PATH` exists. It reports a provider profile as unavailable when the
matching `VIVARIUM_*_PROVIDER_PROFILE` value is not present in that file.

List configured profiles:

```bash
vivarium model \
  --env-file live-readiness.local.env

vivarium providers list \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH"
```

Smoke every v1 profile without repeating model details:

```bash
vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_ANTHROPIC_PROVIDER_PROFILE"

vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"

vivarium providers smoke \
  --profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --profile "$VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE"
```

`doctor --live` runs these saved-profile smokes and keeps provider readiness blocked until all
three calls succeed.

Run a goal through a profile:

```bash
vivarium run \
  --goal "<small real goal>" \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```
