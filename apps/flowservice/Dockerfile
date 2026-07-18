# syntax=docker/dockerfile:1
FROM rust:1.95-bookworm AS chef
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler build-essential cmake pkg-config libcurl4-openssl-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked --version 0.1.77

FROM chef AS planner
COPY pkg/pb ./pkg/pb
COPY apps/flowservice ./apps/flowservice
WORKDIR /app/apps/flowservice
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY pkg/pb ./pkg/pb
WORKDIR /app/apps/flowservice
COPY --from=planner /app/apps/flowservice/recipe.json recipe.json
# Builds only the dependency graph, cacheable independently of app source.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/flowservice/target \
    cargo chef cook --release --recipe-path recipe.json

COPY apps/flowservice ./
# Cache mounts aren't visible to later stages, so copy the binary out first.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/flowservice/target \
    cargo build --release && cp target/release/flowservice /app/flowservice

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/flowservice /service
CMD ["/service"]
