FROM rust:1.95-alpine AS builder

WORKDIR /app

RUN apk add --no-cache protobuf-dev

COPY pkg/pb ./pkg/pb

# Cache dependencies separately; build.rs needs pkg/pb to generate cogito.rs.
COPY apps/userservice/Cargo.toml apps/userservice/Cargo.lock apps/userservice/build.rs ./apps/userservice/
WORKDIR /app/apps/userservice
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# Touch real sources after replacing the stub so Cargo rebuilds app code
# without rerunning build.rs and invalidating dependency codegen.
COPY apps/userservice ./
RUN find src -name '*.rs' -exec touch {} + && cargo build --release

FROM scratch
COPY --from=builder /app/apps/userservice/target/release/userservice /service
CMD ["/service"]
