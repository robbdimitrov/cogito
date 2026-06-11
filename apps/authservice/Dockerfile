FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pkg/pb ./pkg/pb
COPY apps/authservice ./apps/authservice

WORKDIR /app/apps/authservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/apps/authservice/target/release/authservice /service
CMD ["/service"]
