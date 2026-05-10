---
description: Run the v1 daemon under local Docker Compose supervision.
when_to_read: When verifying local daemon process supervision.
---

# Local Compose Daemon

Run the daemon locally with Docker Compose:

```bash
docker compose up -d --build vivarium-daemon
```

The service exposes the daemon HTTP transport on port `8787` and mounts the sibling `the-world` repository read-only at `/world`.

Verify the daemon:

```bash
docker compose ps
bun apps/cli/src/main.ts daemon smoke --status-url http://127.0.0.1:8787/status
```

The Compose service uses `restart: unless-stopped` and a `/status` healthcheck. In sandboxed agent environments, run the smoke command with local-network permission or verify the endpoint with `curl http://127.0.0.1:8787/status`. Cloud deployment remains out of scope for v1.
