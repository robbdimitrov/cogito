FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S thoughts && adduser -S -G thoughts thoughts
COPY --from=builder --chown=thoughts:thoughts /app/package*.json ./
COPY --from=builder --chown=thoughts:thoughts /app/build ./build
COPY --from=builder --chown=thoughts:thoughts /app/node_modules ./node_modules
USER thoughts
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "build/index.js"]
