FROM rust:1.95-slim AS builder

WORKDIR /app

# Install protoc
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev

# Copy pb directory
COPY pb ./pb

# Copy userservice
COPY src/userservice ./src/userservice

WORKDIR /app/src/userservice
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/src/userservice/target/release/userservice /app/userservice

CMD ["/app/userservice"]
