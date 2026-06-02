.PHONY: proto
proto:
	@echo "Generating protobufs for Go services..."
	@cd src/apigateway && protoc --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
	@cd src/postservice && protoc --go_out=. --go-grpc_out=. ../../pb/thoughts.proto

.PHONY: all
all: apigateway authservice database frontend postservice userservice

.PHONY: apigateway
apigateway: proto
	docker build -t localhost:5000/thoughts/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t localhost:5000/thoughts/authservice -f src/authservice/Dockerfile .

.PHONY: database
database:
	docker build -t localhost:5000/thoughts/database src/database

.PHONY: frontend
frontend:
	docker build -t localhost:5000/thoughts/frontend src/frontend

.PHONY: postservice
postservice: proto
	docker build -t localhost:5000/thoughts/postservice src/postservice

.PHONY: userservice
userservice:
	docker build -t localhost:5000/thoughts/userservice src/userservice

