package main

import (
  "os"
  "strconv"

  "postservice/post"
)

func main() {
  port, err := strconv.Atoi(os.Getenv("PORT"))
  if err == nil {
    port = 50054
  }
  dbUrl := os.Getenv("DB_URI")
  server := post.NewServer(port, dbUrl)
  server.Start()
}
