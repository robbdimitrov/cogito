# syntax=docker/dockerfile:1
FROM rust:1.95-bookworm AS chef
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked --version 0.1.77

FROM chef AS planner
COPY pkg/pb ./pkg/pb
COPY apps/authservice ./apps/authservice
WORKDIR /app/apps/authservice
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY pkg/pb ./pkg/pb
WORKDIR /app/apps/authservice
COPY --from=planner /app/apps/authservice/recipe.json recipe.json
# Builds only the dependency graph, cacheable independently of app source.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/authservice/target \
    cargo chef cook --release --recipe-path recipe.json

COPY apps/authservice ./
# Cache mounts aren't visible to later stages, so copy the binary out first.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/authservice/target \
    cargo build --release && cp target/release/authservice /app/authservice

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/authservice /service
CMD ["/service"]
