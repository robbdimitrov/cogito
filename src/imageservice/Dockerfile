FROM golang:1.12-alpine as builder
WORKDIR /go/src/postservice
COPY Gopkg.* .
RUN dep ensure --vendor-only -v
COPY . .
RUN go install .

FROM alpine
COPY --from=builder /go/bin/postservice /postservice
EXPOSE $PORT
ENTRYPOINT ["/postservice"]
