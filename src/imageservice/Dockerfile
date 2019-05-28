FROM golang:1.12 as builder
WORKDIR /go/src/imageservice
COPY Gopkg.* ./
RUN go get github.com/golang/dep/cmd/dep && \
    dep ensure --vendor-only -v
COPY . .
RUN go install .

FROM alpine
COPY --from=builder /go/bin/imageservice /imageservice
EXPOSE $PORT
ENTRYPOINT ["/imageservice"]
