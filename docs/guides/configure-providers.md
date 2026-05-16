---
title: Configure Providers
description: Provider profile setup.
when_to_read: When wiring model adapters.
---

# Configure Providers

Start with the friendly flow unless you are debugging low-level provider wiring:

```bash
vivarium setup live
vivarium connect signup
vivarium connect
```

`vivarium setup live` creates or reuses the private setup file, shows the
Anthropic and OpenRouter key pages, and creates local setup files for provider
keys plus the private OpenAI-compatible endpoint settings before any setup-file
editing.
`vivarium onboard live` remains available as the same live setup wizard. Use `vivarium connect wizard` only when you need custom paths.

Paste provider values into the generated files, then rerun setup:

```bash
~/.vivarium/secrets/anthropic.key
~/.vivarium/secrets/openrouter.key
~/.vivarium/secrets/private-oai.key
~/.vivarium/secrets/private-base-url.txt
~/.vivarium/secrets/private-model.txt
~/.vivarium/secrets/private-context-window.txt

vivarium setup live
```

For scripted updates, `vivarium connect fill` remains available with friendly
labels and file-backed inputs.

Review the dashboard, write the provider profile file, and smoke every saved
profile:

```bash
vivarium connect
vivarium connect setup --confirm-write
vivarium connect smoke
vivarium model
vivarium doctor --live
```

`vivarium connect` summarizes provider names, missing key or model labels,
internal credential labels, evidence-manifest labels, and next commands. It
keeps exact environment variable names behind `--details`. Provider configs
still refer to environment variable names internally so profile files do not
store plaintext provider keys.

## Low-Level Provider Commands

Use these commands only when debugging profile files directly or scripting a
custom setup. The operator path is the friendly `connect` flow above.

The v1 live-readiness path expects all three provider targets from `goal.md` to
be configured:

```bash
export ANTHROPIC_API_KEY=<redacted>
export OPENROUTER_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_API_KEY=<redacted>
export VIVARIUM_OAI_COMPAT_BASE_URL=<private-oai-compatible-base-url>
export VIVARIUM_OAI_COMPAT_MODEL=<private-fine-tune-model>
export VIVARIUM_OAI_COMPAT_CONTEXT_WINDOW=<private-context-window>
export VIVARIUM_PROVIDER_PROFILES_PATH=~/.vivarium/live/provider-profiles.json
export VIVARIUM_ANTHROPIC_PROVIDER_PROFILE=anthropic-main
export VIVARIUM_ANTHROPIC_MODEL=claude-sonnet-4-6
export VIVARIUM_ANTHROPIC_CONTEXT_WINDOW=1000000
export VIVARIUM_OPENROUTER_PROVIDER_PROFILE=openrouter
export VIVARIUM_OPENROUTER_MODEL=openrouter/auto
export VIVARIUM_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
export VIVARIUM_OPENROUTER_CONTEXT_WINDOW=2000000
export VIVARIUM_PRIVATE_OAI_COMPAT_PROVIDER_PROFILE=private-finetune
```

The generated live setup file already fills the Anthropic and OpenRouter model
defaults above. Most operators only need to add the two public API keys, the
private OpenAI-compatible endpoint, and the internal credential values before
running `vivarium connect setup --confirm-write`.

Create all v1 profiles from the default private setup file with the guarded
setup command:

```bash
vivarium connect setup --confirm-write
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
`VIVARIUM_PROVIDER_PROFILES_PATH` exists. It reports a provider profile as
unavailable when the matching `VIVARIUM_*_PROVIDER_PROFILE` value is not present
in that file.

List configured profiles:

```bash
vivarium model

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

`doctor --live` runs these saved-profile smokes and keeps provider readiness
blocked until all three calls succeed.

Run a goal through a profile:

```bash
vivarium local run \
  --goal "<small real goal>" \
  --provider-profiles-path "$VIVARIUM_PROVIDER_PROFILES_PATH" \
  --provider-profile "$VIVARIUM_OPENROUTER_PROVIDER_PROFILE"
```
