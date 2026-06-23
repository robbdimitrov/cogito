export PATH := $(PATH):$(shell go env GOPATH)/bin

.DEFAULT_GOAL := all

IMAGE_PREFIX ?= localhost:5000/thoughts

.PHONY: all
all: apigateway authservice database eventsservice frontend imageservice postservice searchservice userservice

.PHONY: proto
proto:
	@echo "Generating protobufs for Go services..."
	@cd apps/apigateway && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/thoughts.proto
	@cd apps/eventsservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/thoughts.proto
	@cd apps/postservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/thoughts.proto
	@cd apps/searchservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pkg/pb/thoughts.proto

.PHONY: apigateway
apigateway: proto
	docker build -t $(IMAGE_PREFIX)/apigateway apps/apigateway

.PHONY: authservice
authservice:
	docker build -t $(IMAGE_PREFIX)/authservice -f apps/authservice/Dockerfile .

.PHONY: database
database:
	docker build -t $(IMAGE_PREFIX)/database apps/database

.PHONY: frontend
frontend:
	docker build -t $(IMAGE_PREFIX)/frontend apps/frontend

.PHONY: eventsservice
eventsservice: proto
	docker build -t $(IMAGE_PREFIX)/eventsservice apps/eventsservice

.PHONY: imageservice
imageservice:
	docker build -t $(IMAGE_PREFIX)/imageservice -f apps/imageservice/Dockerfile .

.PHONY: postservice
postservice: proto
	docker build -t $(IMAGE_PREFIX)/postservice apps/postservice

.PHONY: searchservice
searchservice: proto
	docker build -t $(IMAGE_PREFIX)/searchservice apps/searchservice

.PHONY: userservice
userservice:
	docker build -t $(IMAGE_PREFIX)/userservice -f apps/userservice/Dockerfile .

.PHONY: format
format:
	@gofmt -w $$(find apps/apigateway apps/eventsservice apps/postservice apps/searchservice -name '*.go' -not -path '*/genproto/*')
	@find apps/authservice/src apps/userservice/src apps/imageservice/src \
		-name '*.rs' -not -name thoughts.rs -print | xargs rustfmt --edition 2024

.PHONY: lint
lint:
	@test -z "$$(gofmt -l $$(find apps/apigateway apps/eventsservice apps/postservice apps/searchservice -name '*.go' -not -path '*/genproto/*'))"
	@find apps/authservice/src apps/userservice/src apps/imageservice/src \
		-name '*.rs' -not -name thoughts.rs -print | xargs rustfmt --edition 2024 --check
	@cd apps/frontend && npm run lint

.PHONY: test
test:
	@echo "Testing apigateway..."
	@cd apps/apigateway && go test -v ./...
	@echo "Testing postservice..."
	@cd apps/postservice && go test -v ./...
	@echo "Testing searchservice..."
	@cd apps/searchservice && go test -v ./...
	@echo "Testing eventsservice..."
	@cd apps/eventsservice && go test -v ./...
	@echo "Testing authservice..."
	@cd apps/authservice && cargo test
	@echo "Testing userservice..."
	@cd apps/userservice && cargo test
	@echo "Testing frontend..."
	@cd apps/frontend && npm run test
	@echo "Testing imageservice..."
	@cd apps/imageservice && cargo test
