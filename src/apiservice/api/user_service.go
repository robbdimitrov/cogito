package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type userService struct {
	addr string
}

func newUserService(addr string) *userService {
	return &userService{addr}
}

// Handlers

func (ct *userService) createUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "CreateUser")
}

func (ct *userService) updateUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "UpdateUser")
}

func (ct *userService) getUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "GetUser")
}

func (ct *userService) getFollowing(c echo.Context) error {
	return c.JSON(http.StatusOK, "GetFollowing")
}

func (ct *userService) getFollowers(c echo.Context) error {
	return c.JSON(http.StatusOK, "GetFollowers")
}

func (ct *userService) followUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "followUser")
}

func (ct *userService) unfollowUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "unfollowUser")
}
