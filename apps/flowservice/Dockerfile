FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev build-base bash openssl-dev pkgconfig

COPY pkg/pb ./pkg/pb

# Cache dependency compilation in its own layer: only Cargo.toml/Cargo.lock
# and build.rs (which needs pkg/pb to codegen cogito.rs) go in first, so this
# expensive layer is invalidated only when dependencies change, not on every
# source edit.
COPY apps/flowservice/Cargo.toml apps/flowservice/Cargo.lock apps/flowservice/build.rs ./apps/flowservice/
WORKDIR /app/apps/flowservice
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

# Overwrite the stub with real sources and rebuild. BuildKit can preserve
# source mtimes from the build context, which may predate the fingerprint
# recorded during the stub build above, so cargo would otherwise think
# nothing changed and reuse the stub binary. Force fresh mtimes on app
# sources only (not build.rs) to guarantee a real rebuild without forcing
# build.rs to rerun and cascade into recompiling every dependency.
COPY apps/flowservice ./
RUN find src -name '*.rs' -exec touch {} + && \
    RUSTFLAGS="-C target-feature=-crt-static" cargo build --release

# rdkafka (librdkafka) requires dynamic linking; scratch is not viable here.
FROM alpine:3.21
RUN apk add --no-cache libgcc openssl
COPY --from=builder /app/apps/flowservice/target/release/flowservice /service
CMD ["/service"]
