FROM oven/bun:1.3.11

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN bun install --frozen-lockfile

EXPOSE 8787

CMD ["bun", "apps/daemon/src/main.ts"]
