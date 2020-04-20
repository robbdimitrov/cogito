package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type imageService struct {
	addr string
}

func newImageService(addr string) *imageService {
	return &imageService{addr}
}

// Handlers

func (ct *imageService) createImage(c echo.Context) error {
	return c.JSON(http.StatusOK, "CreateImage")
}

func (ct *imageService) getImage(c echo.Context) error {
	return c.JSON(http.StatusOK, "GetImage")
}
