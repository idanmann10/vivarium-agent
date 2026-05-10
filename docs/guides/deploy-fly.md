---
title: Deploy Fly
description: Post-v1 deployment notes.
when_to_read: When cloud deployment is introduced.
---

# Deploy Fly

Cloud deployment is out of scope for v1.

This page is a post-v1 note, not a current release path. The v1 daemon is
verified locally through Docker Compose, mounted state, and a read-only world
checkout.

Before a Fly deployment exists, the design needs:

- a persistent state volume for SQLite and encrypted local metadata;
- a world mount or pull strategy for canonical and private subscriptions;
- provider env injection for model keys without storing secrets in the image;
- daemon health checks equivalent to `/status`;
- a decision about whether GitHub write credentials are allowed in the hosted
  process.

Do not treat Fly as live-ready until those decisions are implemented and tested.
Use `docs/guides/deploy-local-compose.md` for the current daemon verification
path.
