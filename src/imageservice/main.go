package main

import (
	"os"

	_ "github.com/lib/pq"

	"postservice/post"
)

func main() {
	server := post.NewServer(os.Getenv("PORT"),
		os.Getenv("DB_URI"), os.Getenv("AUTH_URI"),
		os.Getenv("USER_URI"))
	server.Start()
}
