---
title: Publish a Run
description: Publishable run workflow.
when_to_read: When implementing world publication.
---

# Publish a Run

Runs are opt-in and pass through anonymization before publication.

## Eligibility

A run becomes publishable only when reflection marks it useful and safe to share.
The body must teach a reusable lesson, not just preserve private execution
history. Failed runs can still be useful when they explain a regression or a
repeatable anti-pattern.

## Anonymization

Before a run leaves local state, it passes through deterministic anonymization
and optional provider-backed scrubbing. Check for PII, credentials, home paths,
private URLs, and accidental user data. Publication must preserve evidence
without exposing secrets.

## World Write

Use `world.publishRun` from `SelfTools` or the world write helpers to serialize
the run with explicit `visibility`. Public runs target the canonical world;
private or internal runs should route to a private subscription when one is
configured.
