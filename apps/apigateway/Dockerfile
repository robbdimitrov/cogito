FROM golang:1.26.5-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 go build -v -o service

FROM scratch
COPY --from=builder /app/service /service
CMD ["/service"]
