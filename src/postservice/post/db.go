package post

// Database establishes and handles the connection to the database
type Database struct{}

// NewDatabase creates a new Database instance
func NewDatabase() *Database {
	return &Database{}
}
