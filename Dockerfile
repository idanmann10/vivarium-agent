FROM oven/bun:1.3.11

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock tsconfig.base.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN bun install --frozen-lockfile

EXPOSE 8787

CMD ["bun", "apps/daemon/src/main.ts"]
