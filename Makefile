export PATH := $(PATH):$(shell go env GOPATH)/bin

.DEFAULT_GOAL := all

IMAGE_PREFIX ?= localhost:5000/thoughts

.PHONY: all
all: apigateway authservice database frontend imageservice postservice userservice

.PHONY: proto
proto:
	@echo "Generating protobufs for Go services..."
	@cd src/apigateway && protoc -I../.. --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
	@cd src/postservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pb/thoughts.proto

.PHONY: apigateway
apigateway: proto
	docker build -t $(IMAGE_PREFIX)/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t $(IMAGE_PREFIX)/authservice -f src/authservice/Dockerfile .

.PHONY: database
database:
	docker build -t $(IMAGE_PREFIX)/database src/database

.PHONY: frontend
frontend:
	docker build -t $(IMAGE_PREFIX)/frontend src/frontend

.PHONY: imageservice
imageservice:
	docker build -t $(IMAGE_PREFIX)/imageservice -f src/imageservice/Dockerfile .

.PHONY: postservice
postservice: proto
	docker build -t $(IMAGE_PREFIX)/postservice src/postservice

.PHONY: userservice
userservice:
	docker build -t $(IMAGE_PREFIX)/userservice -f src/userservice/Dockerfile .

.PHONY: format
format:
	@gofmt -w $$(find src/apigateway src/postservice -name '*.go' -not -path '*/genproto/*')
	@find src/authservice/src src/userservice/src src/imageservice/src \
		-name '*.rs' -not -name thoughts.rs -print | xargs rustfmt --edition 2024

.PHONY: lint
lint:
	@test -z "$$(gofmt -l $$(find src/apigateway src/postservice -name '*.go' -not -path '*/genproto/*'))"
	@find src/authservice/src src/userservice/src src/imageservice/src \
		-name '*.rs' -not -name thoughts.rs -print | xargs rustfmt --edition 2024 --check
	@cd src/frontend && npm run lint

.PHONY: test
test:
	@echo "Testing apigateway..."
	@cd src/apigateway && go test -v ./...
	@echo "Testing postservice..."
	@cd src/postservice && go test -v ./...
	@echo "Testing authservice..."
	@cd src/authservice && cargo test
	@echo "Testing userservice..."
	@cd src/userservice && cargo test
	@echo "Testing frontend..."
	@cd src/frontend && npm run test
	@echo "Testing imageservice..."
	@cd src/imageservice && cargo test
