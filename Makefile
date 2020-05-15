.PHONY: all
all: apigateway authservice database frontend
	postservice imageservice userservice

.PHONY: apigateway
apigateway:
	docker build -t thoughts/apigateway src/apigateway

.PHONY: authservice
authservice:
	docker build -t thoughts/authservice src/authservice

.PHONY: database
database:
	docker build -t thoughts/database src/database

.PHONY: frontend
frontend:
	docker build -t thoughts/frontend src/frontend

.PHONY: postservice
postservice:
	docker build -t thoughts/postservice src/postservice

.PHONY: imageservice
imageservice:
	docker build -t thoughts/imageservice src/imageservice

.PHONY: userservice
userservice:
	docker build -t thoughts/userservice src/userservice
