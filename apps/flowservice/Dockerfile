FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev musl-dev cmake openssl-dev pkgconfig

COPY pkg/pb ./pkg/pb
COPY apps/flowservice ./apps/flowservice

WORKDIR /app/apps/flowservice
RUN RUSTFLAGS="-C target-feature=-crt-static" cargo build --release --features docker

# rdkafka (librdkafka) requires dynamic linking; scratch is not viable here.
FROM alpine:3.21
RUN apk add --no-cache libgcc openssl
COPY --from=builder /app/apps/flowservice/target/release/flowservice /service
CMD ["/service"]
