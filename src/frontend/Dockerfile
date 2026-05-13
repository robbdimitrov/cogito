FROM node:20-alpine AS builder
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ENV NODE_OPTIONS=--openssl-legacy-provider
COPY package*.json ./
RUN npm install --no-optional
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
