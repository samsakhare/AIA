FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=backend --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN rm ./package-lock.json && npm install

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npx turbo run build --filter=backend

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=installer /app .

CMD ["node", "apps/backend/dist/index.js"]
