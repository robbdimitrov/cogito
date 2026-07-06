FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev build-base bash openssl-dev pkgconfig

COPY pkg/pb ./pkg/pb

# Cache dependencies separately; build.rs needs pkg/pb to generate cogito.rs.
COPY apps/flowservice/Cargo.toml apps/flowservice/Cargo.lock apps/flowservice/build.rs ./apps/flowservice/
WORKDIR /app/apps/flowservice
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

# Touch real sources after replacing the stub so Cargo rebuilds app code
# without rerunning build.rs and invalidating dependency codegen.
COPY apps/flowservice ./
RUN find src -name '*.rs' -exec touch {} + && \
    RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

# rdkafka (librdkafka) requires dynamic linking; scratch is not viable here.
FROM alpine:3.21
RUN apk add --no-cache libgcc openssl
COPY --from=builder /app/apps/flowservice/target/release/flowservice /service
CMD ["/service"]
