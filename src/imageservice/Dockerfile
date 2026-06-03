FROM rust:1.95-slim AS builder

WORKDIR /app

# Install protoc
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev

# Copy pb directory
COPY pb ./pb

# Copy imageservice
COPY src/imageservice ./src/imageservice

WORKDIR /app/src/imageservice
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/src/imageservice/target/release/imageservice /app/imageservice

CMD ["/app/imageservice"]
