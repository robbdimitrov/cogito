package image

// Error is an error with numerical code, error key and message description
type Error struct {
	Code    int    `json:"code"`
	Error   string `json:"error"`
	Message string `json:"message"`
}
