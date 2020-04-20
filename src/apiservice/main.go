package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"time"

	"github.com/robbdimitrov/thoughts/src/apiservice/api"
)

func main() {
	port := os.Getenv("PORT")
	authAddr := os.Getenv("AUTH_SERVICE_ADDR")
	userAddr := os.Getenv("USER_SERVICE_ADDR")
	postAddr := os.Getenv("POST_SERVICE_ADDR")
	imageAddr := os.Getenv("IMAGE_SERVICE_ADDR")

	e := api.CreateEcho(authAddr, userAddr, postAddr, imageAddr)

	// Start server
	go func() {
		if err := e.Start(fmt.Sprintf(":%s", port)); err != nil {
			e.Logger.Fatal(err)
		}
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}
