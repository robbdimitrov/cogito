.PHONY: all
all: apigateway authservice database frontend
	postservice imageservice userservice

.PHONY: apigateway
apigateway:
	docker build -t localhost:5000/thoughts/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t localhost:5000thoughts/authservice src/authservice

.PHONY: database
database:
	docker build -t localhost:5000thoughts/database src/database

.PHONY: frontend
frontend:
	docker build -t localhost:5000thoughts/frontend src/frontend

.PHONY: postservice
postservice:
	docker build -t localhost:5000thoughts/postservice src/postservice

.PHONY: imageservice
imageservice:
	docker build -t localhost:5000thoughts/imageservice src/imageservice

.PHONY: userservice
userservice:
	docker build -t localhost:5000thoughts/userservice src/userservice
