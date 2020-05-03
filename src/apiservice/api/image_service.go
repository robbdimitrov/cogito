package api

import (
	"github.com/labstack/echo/v4"
)

type imageService struct {
	addr string
}

func newImageService(addr string) *imageService {
	return &imageService{addr}
}

// Handlers

func (s *imageService) createImage(c echo.Context) error {
	// TODO: Proxy request and response to image service
	return c.JSON(200, "CreateImage")
}

func (s *imageService) getImage(c echo.Context) error {
	// TODO: Proxy request and response to image service
	return c.JSON(200, "GetImage")
}
