FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pb ./pb
COPY src/authservice ./src/authservice

WORKDIR /app/src/authservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/src/authservice/target/release/authservice /service
CMD ["/service"]
