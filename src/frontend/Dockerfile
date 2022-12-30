FROM node:18.12-alpine as builder
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-optional
COPY . .
RUN npm run build

FROM nginx:1.23-alpine
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/
