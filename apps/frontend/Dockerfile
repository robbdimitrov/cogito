# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S cogito && adduser -S -G cogito cogito
COPY --from=builder --chown=cogito:cogito /app/package*.json ./
COPY --from=builder --chown=cogito:cogito /app/build ./build
COPY --from=builder --chown=cogito:cogito /app/node_modules ./node_modules
USER cogito
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "build/index.js"]
