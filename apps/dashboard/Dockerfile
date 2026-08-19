FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=dashboard --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npx turbo run build --filter=dashboard

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=installer /app/apps/dashboard/next.config.ts .
COPY --from=installer /app/apps/dashboard/package.json .

COPY --from=installer /app/apps/dashboard/.next/standalone ./
COPY --from=installer /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=installer /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/dashboard/server.js"]
