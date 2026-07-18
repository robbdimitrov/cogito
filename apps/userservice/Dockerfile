# syntax=docker/dockerfile:1
FROM rust:1.95-trixie AS chef
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked --version 0.1.77

FROM chef AS planner
COPY pkg/pb ./pkg/pb
COPY apps/userservice ./apps/userservice
WORKDIR /app/apps/userservice
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY pkg/pb ./pkg/pb
WORKDIR /app/apps/userservice
COPY --from=planner /app/apps/userservice/recipe.json recipe.json
# Builds only the dependency graph, cacheable independently of app source.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/userservice/target \
    cargo chef cook --release --recipe-path recipe.json

COPY apps/userservice ./
# clean -p forces build.rs to rerun; the cache mount can otherwise skip it
# and leave the build.rs-generated src/cogito.rs stale or missing.
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/apps/userservice/target \
    cargo clean --release --package userservice && \
    cargo build --release && cp target/release/userservice /app/userservice

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/userservice /service
CMD ["/service"]
