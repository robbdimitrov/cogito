package post

import (
	"database/sql"
	"log"
)

// Database establishes and handles the connection to the database
type Database struct {
	dbURI string
	conn  *sql.DB
}

// NewDatabase creates a new Database instance
func NewDatabase(dbURI string) *Database {
	return &Database{dbURI: dbURI}
}

// GetConn establishes and returns a connection to the database
func (db *Database) GetConn() *sql.DB {
	var err error
	db.conn, err = sql.Open("postgres", db.dbURI)
	if err != nil {
		log.Fatal(err)
	}
	return db.conn
}

// Close closes the existing connection to the database
func (db *Database) Close() {
	db.conn.Close()
	db.conn = nil
}
