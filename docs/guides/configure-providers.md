---
title: Configure Providers
description: Provider profile setup.
when_to_read: When wiring model adapters.
---

# Configure Providers

Provider configs refer to environment variable names for keys.

Save named profiles locally:

```bash
bun apps/cli/src/index.ts providers configure \
  --profiles-path ~/.the-agent/provider-profiles.json \
  --name anthropic-main \
  --kind anthropic \
  --api-key-env ANTHROPIC_API_KEY \
  --model <anthropic-model> \
  --capability chat \
  --capability tools \
  --context-window 200000 \
  --cost-class expensive

bun apps/cli/src/index.ts providers configure \
  --profiles-path ~/.the-agent/provider-profiles.json \
  --name openrouter \
  --kind openai-compat \
  --api-key-env OPENROUTER_API_KEY \
  --model <openrouter-model> \
  --base-url <openrouter-base-url> \
  --capability chat \
  --capability json_mode \
  --context-window 128000 \
  --cost-class medium
```

List configured profiles:

```bash
bun apps/cli/src/index.ts providers list \
  --profiles-path ~/.the-agent/provider-profiles.json
```

Smoke a profile without repeating model details:

```bash
bun apps/cli/src/index.ts providers smoke \
  --profiles-path ~/.the-agent/provider-profiles.json \
  --profile openrouter
```

Run a goal through a profile:

```bash
bun apps/cli/src/index.ts run \
  --goal "<small real goal>" \
  --provider-profiles-path ~/.the-agent/provider-profiles.json \
  --provider-profile openrouter
```
