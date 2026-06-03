export PATH := $(PATH):$(shell go env GOPATH)/bin

.PHONY: proto
proto:
	@echo "Generating protobufs for Go services..."
	@cd src/apigateway && protoc -I../.. --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
	@cd src/postservice && protoc -I../.. --go_out=. --go-grpc_out=. ../../pb/thoughts.proto

.PHONY: all
all: apigateway authservice migration frontend imageservice postservice userservice

.PHONY: apigateway
apigateway: proto
	docker build -t localhost:5000/thoughts/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t localhost:5000/thoughts/authservice -f src/authservice/Dockerfile .

.PHONY: migration
migration:
	docker build -t localhost:5000/thoughts/migration src/database

.PHONY: frontend
frontend:
	docker build -t localhost:5000/thoughts/frontend src/frontend

.PHONY: imageservice
imageservice:
	docker build -t localhost:5000/thoughts/imageservice -f src/imageservice/Dockerfile .

.PHONY: postservice
postservice: proto
	docker build -t localhost:5000/thoughts/postservice src/postservice

.PHONY: userservice
userservice:
	docker build -t localhost:5000/thoughts/userservice -f src/userservice/Dockerfile .

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
