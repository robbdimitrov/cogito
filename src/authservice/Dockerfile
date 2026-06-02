FROM rust:slim AS builder

WORKDIR /app

# Install protoc
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev

# Copy pb directory
COPY pb ./pb

# Copy authservice
COPY src/authservice ./src/authservice

WORKDIR /app/src/authservice
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/src/authservice/target/release/authservice /app/authservice

CMD ["/app/authservice"]
