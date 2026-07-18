FROM rust:1.95-alpine3.21 AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev build-base librdkafka-dev pkgconfig

COPY pkg/pb ./pkg/pb

COPY apps/flowservice/Cargo.toml apps/flowservice/Cargo.lock apps/flowservice/build.rs ./apps/flowservice/
WORKDIR /app/apps/flowservice
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

COPY apps/flowservice ./
RUN find src -name '*.rs' -exec touch {} + && \
    RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

FROM alpine:3.21
RUN apk add --no-cache libgcc librdkafka
COPY --from=builder /app/apps/flowservice/target/release/flowservice /service
CMD ["/service"]
