FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY packages/pb ./packages/pb
COPY apps/userservice ./apps/userservice

WORKDIR /app/apps/userservice
RUN cargo build --release

FROM scratch
COPY --from=builder /app/apps/userservice/target/release/userservice /service
CMD ["/service"]
