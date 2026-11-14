FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src/lib/config.ts ./src/lib/config.ts
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS migrate
WORKDIR /migrate
RUN npm init -y >/dev/null && npm install --no-audit --no-fund prisma@7.10.1

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/app.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=migrate /migrate/node_modules /migrate/node_modules
COPY --from=build /app/prisma /migrate/prisma
COPY --from=build /app/prisma.config.ts /migrate/prisma.config.ts
COPY --from=build /app/src/lib/config.ts /migrate/src/lib/config.ts
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
CMD ["sh", "-c", "cd /migrate && ./node_modules/.bin/prisma migrate deploy && cd /app && exec node server.js"]
