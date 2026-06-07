FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pb ./pb
COPY apps/imageservice ./apps/imageservice

WORKDIR /app/apps/imageservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/apps/imageservice/target/release/imageservice /service
CMD ["/service"]
