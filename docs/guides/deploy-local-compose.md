---
description: Run the v1 daemon under local Docker Compose supervision.
when_to_read: When verifying local daemon process supervision.
---

# Local Compose Daemon

Run the daemon locally with Docker Compose:

```bash
docker compose up --build vivarium-daemon
```

The service exposes the daemon HTTP transport on port `8787` and mounts the sibling `the-world` repository read-only at `/world`.

Verify the daemon:

```bash
bun apps/cli/src/index.ts daemon smoke --status-url http://127.0.0.1:8787/status
```

The Compose service uses `restart: unless-stopped` and a `/status` healthcheck. Cloud deployment remains out of scope for v1.
