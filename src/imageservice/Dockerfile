FROM golang:1.13 as builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -v -o service

FROM scratch
COPY --from=builder /app/service /service
CMD ["/service"]
