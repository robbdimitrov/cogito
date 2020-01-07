.PHONY: all
all: apiservice frontend database authservice
	userservice postservice imageservice

.PHONY: apiservice
apiservice:
	docker build -t thoughts/apiservice src/apiservice

.PHONY: frontend
frontend:
	docker build -t thoughts/frontend src/frontend

.PHONY: database
database:
	docker build -t thoughts/database src/database

.PHONY: authservice
authservice:
	docker build -t thoughts/authservice src/authservice

.PHONY: userservice
userservice:
	docker build -t thoughts/userservice src/userservice

.PHONY: postservice
postservice:
	docker build -t thoughts/postservice src/postservice

.PHONY: imageservice
imageservice:
	docker build -t thoughts/imageservice src/imageservice
