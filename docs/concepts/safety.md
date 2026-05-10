---
title: Safety
description: Pre-action checks, refusal, and publish anonymization.
when_to_read: When implementing destructive action checks or artifact publication.
---

# Safety

Refusal is a normal outcome. Destructive actions require confirmation. Publishable artifacts pass through anonymization.

Safety is enforced before action, during tool dispatch, and before publication.
It should be a boring runtime property, not an optional behavior remembered by a
model prompt.

## Action Safety

HTTP and file requests use allowlist checks, configured rate limits, destructive
confirmation, and argument scrubbing for credential-like values. The dispatcher
blocks unsafe external requests before they reach adapters and can emit sanitized
safety-surprise evidence without echoing secrets.

## Interface Safety

`computer-use` actions are higher risk because they operate against a real UI.
Click and type calls require confirmation based on the configured policy,
especially for system-level targets or password fields. Refusal, escalation, and
asking the user are valid outcomes when the safe path is unclear.

## Publication Safety

Runs, traces, and proposal bodies pass through anonymization before becoming
publishable artifacts. The world should receive useful lessons, not private
identifiers, credentials, or accidental user data.
