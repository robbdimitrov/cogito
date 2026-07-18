FROM rust:1.95-alpine3.21 AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev build-base cmake pkgconfig curl-dev zlib-static

COPY pkg/pb ./pkg/pb

COPY apps/flowservice/Cargo.toml apps/flowservice/Cargo.lock apps/flowservice/build.rs ./apps/flowservice/
WORKDIR /app/apps/flowservice
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

COPY apps/flowservice ./
RUN find src -name '*.rs' -exec touch {} + && cargo build --release

FROM scratch
COPY --from=builder /app/apps/flowservice/target/release/flowservice /service
CMD ["/service"]
