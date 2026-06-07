FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pb ./pb
COPY src/userservice ./src/userservice

WORKDIR /app/src/userservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/src/userservice/target/release/userservice /service
CMD ["/service"]
