package search

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

const (
	backoffBase = time.Second
	backoffMax  = 30 * time.Second
	maxAttempts = 5
)

func Run(ctx context.Context, db *pgxpool.Pool, meili *MeiliClient) {
	conn, err := db.Acquire(ctx)
	if err != nil {
		slog.Error("worker: failed to acquire listen connection", "error", err)
		return
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "LISTEN search_outbox"); err != nil {
		slog.Error("worker: LISTEN failed", "error", err)
		return
	}
	slog.Info("worker: listening on search_outbox")

	backoff := backoffBase
	for {
		n, err := drainBatch(ctx, db, meili)
		if err != nil {
			slog.Warn("worker: drain error", "error", err)
		} else if n > 0 {
			backoff = backoffBase
			continue
		}

		waitCtx, cancel := context.WithTimeout(ctx, backoff)
		_, _ = conn.Conn().WaitForNotification(waitCtx)
		cancel()

		if ctx.Err() != nil {
			return
		}

		if n == 0 && err == nil {
			if backoff < backoffMax {
				backoff *= 2
				if backoff > backoffMax {
					backoff = backoffMax
				}
			}
		}
	}
}

func drainBatch(ctx context.Context, db *pgxpool.Pool, meili *MeiliClient) (int, error) {
	txCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	tx, err := db.BeginTx(txCtx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(txCtx) }()

	rows, err := DrainOutbox(txCtx, tx)
	if err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, nil
	}

	for _, row := range rows {
		if err := syncRow(txCtx, db, meili, tx, row); err != nil {
			slog.Warn("worker: sync failed", "entity_type", row.EntityType, "entity_id", row.EntityID, "error", err)
		}
	}

	return len(rows), tx.Commit(txCtx)
}

func syncRow(ctx context.Context, db *pgxpool.Pool, meili *MeiliClient, tx pgx.Tx, row OutboxRow) error {
	idx := indexForType(row.EntityType)
	if idx == "" {
		_, _ = tx.Exec(ctx, "DELETE FROM search_outbox WHERE id = $1", row.ID)
		return fmt.Errorf("unknown entity_type %q", row.EntityType)
	}

	var doc map[string]any
	var fetchErr error

	switch row.EntityType {
	case "user":
		u, err := GetUser(ctx, db, row.EntityID)
		fetchErr = err
		if u != nil {
			doc = docToMap(u)
		}
	case "post":
		p, err := GetPost(ctx, db, row.EntityID)
		fetchErr = err
		if p != nil {
			doc = docToMap(p)
		}
	case "hashtag":
		h, err := GetHashtag(ctx, db, row.EntityID)
		fetchErr = err
		if h != nil {
			doc = docToMap(h)
		}
	}

	if fetchErr != nil {
		if row.Attempts+1 >= maxAttempts {
			slog.Warn("worker: giving up on row", "id", row.ID, "entity_type", row.EntityType, "entity_id", row.EntityID)
			_, _ = tx.Exec(ctx, "DELETE FROM search_outbox WHERE id = $1", row.ID)
		} else {
			_, _ = tx.Exec(ctx, "UPDATE search_outbox SET attempts = attempts + 1 WHERE id = $1", row.ID)
		}
		return fetchErr
	}

	var meiliErr error
	if doc == nil {
		meiliErr = meili.DeleteDoc(idx, row.EntityID)
	} else {
		switch row.EntityType {
		case "user":
			meiliErr = meili.UpsertUsers([]map[string]any{doc})
		case "post":
			meiliErr = meili.UpsertPosts([]map[string]any{doc})
		case "hashtag":
			meiliErr = meili.UpsertHashtags([]map[string]any{doc})
		}
	}

	if meiliErr != nil {
		if row.Attempts+1 >= maxAttempts {
			slog.Warn("worker: giving up on row after meili error", "id", row.ID, "entity_type", row.EntityType, "entity_id", row.EntityID, "error", meiliErr)
			_, _ = tx.Exec(ctx, "DELETE FROM search_outbox WHERE id = $1", row.ID)
		} else {
			_, _ = tx.Exec(ctx, "UPDATE search_outbox SET attempts = attempts + 1 WHERE id = $1", row.ID)
		}
		return meiliErr
	}

	_, _ = tx.Exec(ctx, "DELETE FROM search_outbox WHERE id = $1", row.ID)
	return nil
}

// RunBackfill indexes all entities in batches of 500 under an advisory lock so
// only one replica performs the backfill at startup.
func RunBackfill(ctx context.Context, db *pgxpool.Pool, meili *MeiliClient) {
	conn, err := db.Acquire(ctx)
	if err != nil {
		slog.Error("backfill: failed to acquire connection", "error", err)
		return
	}
	defer conn.Release()

	if !TryAcquireBackfillLock(ctx, conn) {
		slog.Info("backfill: another replica holds the lock, skipping")
		return
	}
	defer ReleaseBackfillLock(ctx, conn)
	slog.Info("backfill: lock acquired, starting")

	const batchSize = 500
	for _, entityType := range []string{"users", "posts", "hashtags"} {
		offset := 0
		for {
			var docs []map[string]any
			var err error

			switch entityType {
			case "users":
				batch, e := StreamUsers(ctx, db, offset, batchSize)
				err = e
				for _, d := range batch {
					docs = append(docs, docToMap(d))
				}
			case "posts":
				batch, e := StreamPosts(ctx, db, offset, batchSize)
				err = e
				for _, d := range batch {
					docs = append(docs, docToMap(d))
				}
			case "hashtags":
				batch, e := StreamHashtags(ctx, db, offset, batchSize)
				err = e
				for _, d := range batch {
					docs = append(docs, docToMap(d))
				}
			}

			if err != nil {
				slog.Error("backfill: fetch error", "entity", entityType, "offset", offset, "error", err)
				break
			}
			if len(docs) == 0 {
				break
			}

			switch entityType {
			case "users":
				err = meili.UpsertUsers(docs)
			case "posts":
				err = meili.UpsertPosts(docs)
			case "hashtags":
				err = meili.UpsertHashtags(docs)
			}
			if err != nil {
				slog.Error("backfill: meili upsert error", "entity", entityType, "offset", offset, "error", err)
				break
			}
			slog.Info("backfill: upserted batch", "entity", entityType, "offset", offset, "count", len(docs))

			offset += len(docs)
			if len(docs) < batchSize {
				break
			}

			if ctx.Err() != nil {
				return
			}
		}
	}
	slog.Info("backfill: complete")
}
