FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pb ./pb
COPY src/imageservice ./src/imageservice

WORKDIR /app/src/imageservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/src/imageservice/target/release/imageservice /service
CMD ["/service"]
