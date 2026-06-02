FROM golang:1.26-alpine AS builder
WORKDIR /usr/src/app
COPY go.* .
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -v -o service

FROM scratch
COPY --from=builder /usr/src/app/service /service
CMD ["/service"]
