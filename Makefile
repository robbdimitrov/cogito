.PHONY: all
all: apigateway authservice database frontend postservice userservice

.PHONY: apigateway
apigateway:
	docker build -t localhost:5000/thoughts/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t localhost:5000/thoughts/authservice src/authservice

.PHONY: database
database:
	docker build -t localhost:5000/thoughts/database src/database

.PHONY: frontend
frontend:
	docker build -t localhost:5000/thoughts/frontend src/frontend

.PHONY: postservice
postservice:
	docker build -t localhost:5000/thoughts/postservice src/postservice

.PHONY: userservice
userservice:
	docker build -t localhost:5000/thoughts/userservice src/userservice

