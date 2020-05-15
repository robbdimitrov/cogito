package api

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type imageController struct {
	addr   string
	client *http.Client
}

func newImageController(addr string) *imageController {
	client := &http.Client{Timeout: time.Second * 10}
	return &imageController{addr, client}
}

func (ic *imageController) createImage(c echo.Context) error {
	url := fmt.Sprintf("http://%s/uploads", ic.addr)
	req, err := http.NewRequest("POST", url, c.Request().Body)
	if err != nil {
		log.Printf("Creating request failed %v", err)
		return echo.NewHTTPError(500)
	}

	copyHeader(c.Request().Header, req.Header, "content-type")
	copyHeader(c.Request().Header, req.Header, "content-length")

	res, err := ic.client.Do(req)
	if err != nil {
		log.Printf("Uploading image failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer res.Body.Close()

	return c.Stream(res.StatusCode, res.Header.Get("content-type"), res.Body)
}

func (ic *imageController) getImage(c echo.Context) error {
	url := fmt.Sprintf("http://%s/uploads/%s", ic.addr, c.Param("filename"))
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("Creating request failed: %v", err)
		return echo.NewHTTPError(500)
	}

	res, err := ic.client.Do(req)
	if err != nil {
		log.Printf("Getting image failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer res.Body.Close()

	copyHeader(res.Header, c.Response().Header(), "content-length")
	copyHeader(res.Header, c.Response().Header(), "last-modified")
	copyHeader(res.Header, c.Response().Header(), "date")

	return c.Stream(res.StatusCode, res.Header.Get("content-type"), res.Body)
}
