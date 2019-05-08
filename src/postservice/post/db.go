package post

// Database establishes and handles the connection to the database
type Database struct {
	dbURI string
}

// NewDatabase creates a new Database instance
func NewDatabase(dbURI string) *Database {
	return &Database{dbURI}
}

// GetConn establishes and returns a connection to the database
func (db *Database) GetConn() {

}

// Close closes the existing connection to the database
func (db *Database) Close() {

}
