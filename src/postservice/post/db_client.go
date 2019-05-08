package post

// DbClient manages the communication between services and database
type DbClient struct {
	db *Database
}

// NewDbClient creates a new DbClient instance
func NewDbClient(db *Database) *DbClient {
	return &DbClient{db}
}
