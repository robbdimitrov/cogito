# syntax=docker/dockerfile:1
FROM rust:1.95-bookworm AS chef
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked --version 0.1.77

FROM chef AS planner
COPY pkg/pb ./pkg/pb
COPY apps/imageservice ./apps/imageservice
WORKDIR /app/apps/imageservice
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY pkg/pb ./pkg/pb
WORKDIR /app/apps/imageservice
COPY --from=planner /app/apps/imageservice/recipe.json recipe.json
# Builds only the dependency graph, cacheable independently of app source.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/imageservice/target \
    cargo chef cook --release --recipe-path recipe.json

COPY apps/imageservice ./
# Cache mounts aren't visible to later stages, so copy the binary out first.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/imageservice/target \
    cargo build --release && cp target/release/imageservice /app/imageservice

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/imageservice /service
CMD ["/service"]
