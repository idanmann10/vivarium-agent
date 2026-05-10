---
title: Config Schema
description: Reference for agent configuration.
when_to_read: When implementing init, status, or doctor.
---

# Config Schema

The canonical TypeScript shape is `packages/core/src/types/agent.ts`. This reference explains how to read it when wiring init, status, doctor, or runtime configuration.

## AgentConfig

`AgentConfig` is the root local agent configuration. It identifies the agent, chooses subscribed worlds, selects providers, and sets runtime limits.

```ts
interface AgentConfig {
  id: AgentId;
  name: string;
  worlds: readonly WorldSubscription[];
  providers: ProvidersConfig;
  attention: AttentionConfig;
  habituation: HabituationConfig;
  safety: SafetyConfig;
}
```

`id` is the stable local identity. `name` is the human-readable final agent name. `worlds` controls retrieval and optional publish targets. `providers` controls executor, validator, and fallback model choices. `attention`, `habituation`, and `safety` provide local defaults that the runtime and CLI can project into narrower command options.

## WorldSubscription

```ts
interface WorldSubscription {
  ref: WorldRef;
  priority: number;
  autoPushEnabled: boolean;
}
```

`ref` is the durable world identifier or remote reference. Lower `priority` values should be searched first when the caller wants private or team knowledge to outrank canonical public knowledge. `autoPushEnabled` is only appropriate for trusted private forks or other targets where generated proposals are allowed to be staged automatically.

## ProvidersConfig

```ts
interface ProvidersConfig {
  executor: ProviderRef;
  validator: ProviderRef;
  fallbacks: readonly ProviderRef[];
}
```

`executor` handles normal planning and execution calls. `validator` should be a separate provider family when possible so validation is not just self-confirmation. `fallbacks` are ordered alternatives for outages, missing capabilities, or cost controls.

## ProviderRef

```ts
interface ProviderRef {
  kind: "anthropic" | "openai" | "openai-compat";
  model: string;
  baseUrl?: string;
  apiKeyEnvVar: string;
  capabilities: readonly Capability[];
  contextWindow: number;
  costClass: CostClass;
}
```

`apiKeyEnvVar` stores the environment variable name, never the secret value. `baseUrl` is required for `openai-compat` providers and omitted for first-party `anthropic` or `openai` providers. `capabilities` uses `"chat"`, `"tools"`, `"json_mode"`, `"vision"`, and `"embedding"`. `costClass` is `"cheap"`, `"medium"`, or `"expensive"` and feeds provider selection.

## AttentionConfig

```ts
interface AttentionConfig {
  maxSkillsInContext: number;
  maxToolsActive: number;
  maxWorkingTokens: number;
  maxEpisodesInContext: number;
}
```

These values bound the planning context before model calls. The roadmap defaults are 8 skills, 20 active tools, 12,000 working tokens, and 5 recent episodes. Runtime attention self-tools can temporarily narrow or restore these limits for a run.

## HabituationConfig

```ts
interface HabituationConfig {
  enabled: boolean;
  maxHabitual: number;
  minUses: number;
  minLb: number;
}
```

Habituation makes frequently useful promoted skills load before normal retrieval-selected skills. The roadmap defaults are enabled, at most 5 habitual skills, at least 30 uses, and Wilson lower bound at least 0.65.

## SafetyConfig

```ts
interface SafetyConfig {
  httpAllowlist: readonly string[];
  httpRateLimit: { readonly perRun: number; readonly perDay: number };
  destructiveEndpointsRequireConfirmation: boolean;
  computerUseConfirmationLevel: "always" | "system_only" | "never";
}
```

`httpAllowlist` defines where `http.request` may connect. `httpRateLimit` sets per-run and per-day caps for external HTTP use. `destructiveEndpointsRequireConfirmation` keeps destructive methods and endpoints behind explicit approval. `computerUseConfirmationLevel` controls whether `computer.click` and `computer.type` require confirmation always, only for system-level targets such as admin dialogs or password fields, or never.

## Related Runtime State

`Identity` and `AttentionUsage` are adjacent runtime shapes, not root config sections. `Identity` records the current developmental stage and summary. `AttentionUsage` reports how much context is currently in use after attention limits are applied.
