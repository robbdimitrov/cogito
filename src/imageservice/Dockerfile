FROM golang:1.12-alpine as builder
RUN apk add --no-cache ca-certificates git &&\
    go get github.com/golang/dep/cmd/dep
WORKDIR /go/src/imageservice
COPY Gopkg.* ./
RUN dep ensure --vendor-only -v
COPY . .
RUN go install .

FROM alpine
COPY --from=builder /go/bin/imageservice /imageservice
ENTRYPOINT ["/imageservice"]
