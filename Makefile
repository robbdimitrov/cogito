export PATH := $(PATH):$(shell go env GOPATH)/bin

.DEFAULT_GOAL := all

IMAGE_PREFIX ?= cogito
GIT_SHA ?= $(shell git rev-parse --short HEAD)

.PHONY: all
all: apigateway authservice database flowservice frontend imageservice postservice userservice

.PHONY: help
help:
	@printf 'Cogito support targets:\n'
	@printf '  make              Build all images\n'
	@printf '  make <service>    Build one service image\n'
	@printf '  make proto        Regenerate Go protobuf bindings\n'
	@printf '  make format       Format handwritten Go and Rust\n'
	@printf '  make lint         Formatting checks and frontend lint\n'
	@printf '  make test         Run all unit tests\n'

.PHONY: proto
proto:
	@echo "Generating protobufs for Go services..."
	@cd apps/apigateway && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/cogito.proto
	@cd apps/postservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/cogito.proto

.PHONY: apigateway
apigateway: proto
	docker build -t $(IMAGE_PREFIX)/apigateway:$(GIT_SHA) apps/apigateway

.PHONY: authservice
authservice:
	docker build -t $(IMAGE_PREFIX)/authservice:$(GIT_SHA) -f apps/authservice/Dockerfile .

.PHONY: database
database:
	docker build -t $(IMAGE_PREFIX)/database:$(GIT_SHA) apps/database

.PHONY: frontend
frontend:
	docker build -t $(IMAGE_PREFIX)/frontend:$(GIT_SHA) apps/frontend

.PHONY: flowservice
flowservice:
	docker build -t $(IMAGE_PREFIX)/flowservice:$(GIT_SHA) -f apps/flowservice/Dockerfile .

.PHONY: imageservice
imageservice:
	docker build -t $(IMAGE_PREFIX)/imageservice:$(GIT_SHA) -f apps/imageservice/Dockerfile .

.PHONY: postservice
postservice: proto
	docker build -t $(IMAGE_PREFIX)/postservice:$(GIT_SHA) apps/postservice

.PHONY: userservice
userservice:
	docker build -t $(IMAGE_PREFIX)/userservice:$(GIT_SHA) -f apps/userservice/Dockerfile .

.PHONY: format
format:
	@gofmt -w $$(find apps/apigateway apps/postservice -name '*.go' -not -path '*/genproto/*')
	@find apps/authservice/src apps/userservice/src apps/imageservice/src apps/flowservice/src \
		-name '*.rs' -not -name cogito.rs -print | xargs rustfmt --edition 2024

.PHONY: lint
lint:
	@test -z "$$(gofmt -l $$(find apps/apigateway apps/postservice -name '*.go' -not -path '*/genproto/*'))"
	@find apps/authservice/src apps/userservice/src apps/imageservice/src apps/flowservice/src \
		-name '*.rs' -not -name cogito.rs -print | xargs rustfmt --edition 2024 --check
	@cd apps/frontend && npm run lint

.PHONY: test
test:
	@echo "Testing apigateway..."
	@cd apps/apigateway && go test -v ./...
	@echo "Testing postservice..."
	@cd apps/postservice && go test -v ./...
	@echo "Testing flowservice..."
	@cd apps/flowservice && cargo test
	@echo "Testing authservice..."
	@cd apps/authservice && cargo test
	@echo "Testing userservice..."
	@cd apps/userservice && cargo test
	@echo "Testing frontend..."
	@cd apps/frontend && npm run test
	@echo "Testing imageservice..."
	@cd apps/imageservice && cargo test
