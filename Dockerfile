FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build --configuration production

FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate && pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist/trazabilidad-front ./dist/trazabilidad-front

USER node

EXPOSE 4000

ENV PORT=4000

CMD ["node", "dist/trazabilidad-front/server/server.mjs"]
