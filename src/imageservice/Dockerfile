FROM golang:1.14 as builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . ./
RUN go build -v -o service

FROM scratch
COPY --from=builder /app/service /service
CMD ["/service"]
