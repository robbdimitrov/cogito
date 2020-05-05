package api

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
)

type imageService struct {
	addr   string
	client *http.Client
}

func newImageService(addr string) *imageService {
	var client = &http.Client{Timeout: time.Second * 10}
	return &imageService{addr, client}
}

// Handlers

func (s *imageService) createImage(c echo.Context) error {
	url := fmt.Sprintf("http://%s/uploads", s.addr)
	req, err := http.NewRequest("POST", url, c.Request().Body)
	req.Header = c.Request().Header
	if err != nil {
		log.Printf("Creating request failed %s\n", err)
		return echo.NewHTTPError(500)
	}

	res, err := s.client.Do(req)
	if err != nil {
		log.Printf("Uploading image failed %s\n", err)
		return echo.NewHTTPError(500)
	}

	return c.Stream(res.StatusCode, res.Header.Get("Content-Type"), res.Body)
}

func (s *imageService) getImage(c echo.Context) error {
	// TODO: Proxy request and response to image service

	fmt.Fprintf(os.Stdout, "[%s] %s", time.Now().Format(time.RFC3339), "message")
	// return c.Stream(res.StatusCode, res.Header.Get("Content-Type"), res.Body)
	return c.JSON(200, "CreateImage")
}
