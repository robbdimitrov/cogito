FROM golang:1.19 as builder
WORKDIR /usr/src/app
COPY go.* .
RUN go mod download
COPY . .
RUN go build -v -o service

FROM scratch
COPY --from=builder /usr/src/app/service /service
CMD ["/service"]
