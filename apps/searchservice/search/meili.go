package search

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	meilisearch "github.com/meilisearch/meilisearch-go"
)

const scopedKeyUID = "searchservice-scoped-key"

type MeiliClient struct {
	client meilisearch.ServiceManager
}

// NewMeiliClient connects with masterKey, provisions a scoped API key (fixed UID,
// idempotent), creates the three indexes with correct settings, then returns a
// client configured with the scoped key. The master key is not retained.
func NewMeiliClient(host, masterKey string) (*MeiliClient, error) {
	master := meilisearch.New(host, meilisearch.WithAPIKey(masterKey))

	scopedKey, err := provisionScopedKey(master)
	if err != nil {
		return nil, fmt.Errorf("provisioning meili key: %w", err)
	}

	httpClient := &http.Client{Timeout: 10 * time.Second}
	client := meilisearch.New(host, meilisearch.WithAPIKey(scopedKey), meilisearch.WithCustomClient(httpClient))

	if err := ensureIndexes(master); err != nil {
		return nil, fmt.Errorf("ensuring meili indexes: %w", err)
	}

	return &MeiliClient{client: client}, nil
}

func provisionScopedKey(master meilisearch.ServiceManager) (string, error) {
	existing, err := master.GetKey(scopedKeyUID)
	if err == nil {
		return existing.Key, nil
	}
	key, err := master.CreateKey(&meilisearch.Key{
		UID:         scopedKeyUID,
		Description: "searchservice operational key",
		Actions:     []string{"search", "documents.add", "documents.update", "documents.delete", "indexes.get"},
		Indexes:     []string{"users", "posts", "hashtags"},
	})
	if err != nil {
		return "", err
	}
	return key.Key, nil
}

func ensureIndexes(master meilisearch.ServiceManager) error {
	type indexDef struct {
		uid        string
		searchable []string
		filterable []string
		sortable   []string
	}
	indexes := []indexDef{
		{uid: "users", searchable: []string{"username", "name"}},
		{uid: "posts", searchable: []string{"content", "username"}, filterable: []string{"hashtags"}, sortable: []string{"created_at"}},
		{uid: "hashtags", searchable: []string{"name"}, sortable: []string{"post_count"}},
	}
	for _, def := range indexes {
		_, err := master.GetIndex(def.uid)
		if err != nil {
			task, err := master.CreateIndex(&meilisearch.IndexConfig{Uid: def.uid, PrimaryKey: "id"})
			if err != nil {
				return fmt.Errorf("create index %s: %w", def.uid, err)
			}
			if _, err := master.WaitForTask(task.TaskUID, 50*time.Millisecond); err != nil {
				return fmt.Errorf("wait for index %s creation: %w", def.uid, err)
			}
			slog.Info("created meili index", "index", def.uid)
		}
		idx := master.Index(def.uid)
		if len(def.searchable) > 0 {
			if _, err := idx.UpdateSearchableAttributes(&def.searchable); err != nil {
				return fmt.Errorf("update searchable %s: %w", def.uid, err)
			}
		}
		if len(def.filterable) > 0 {
			if _, err := idx.UpdateFilterableAttributes(&def.filterable); err != nil {
				return fmt.Errorf("update filterable %s: %w", def.uid, err)
			}
		}
		if len(def.sortable) > 0 {
			if _, err := idx.UpdateSortableAttributes(&def.sortable); err != nil {
				return fmt.Errorf("update sortable %s: %w", def.uid, err)
			}
		}
	}
	return nil
}

func (m *MeiliClient) UpsertUsers(docs []map[string]any) error {
	_, err := m.client.Index("users").AddDocuments(docs, "id")
	return err
}

func (m *MeiliClient) UpsertPosts(docs []map[string]any) error {
	_, err := m.client.Index("posts").AddDocuments(docs, "id")
	return err
}

func (m *MeiliClient) UpsertHashtags(docs []map[string]any) error {
	_, err := m.client.Index("hashtags").AddDocuments(docs, "id")
	return err
}

func (m *MeiliClient) DeleteDoc(index, id string) error {
	_, err := m.client.Index(index).DeleteDocument(id)
	return err
}

func (m *MeiliClient) SearchUsers(query string, limit, offset int32) ([]map[string]any, error) {
	return m.search("users", query, limit, offset)
}

func (m *MeiliClient) SearchPosts(query string, limit, offset int32) ([]map[string]any, error) {
	return m.search("posts", query, limit, offset)
}

func (m *MeiliClient) SearchHashtags(query string, limit, offset int32) ([]map[string]any, error) {
	return m.search("hashtags", query, limit, offset)
}

func (m *MeiliClient) search(index, query string, limit, offset int32) ([]map[string]any, error) {
	res, err := m.client.Index(index).Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Offset: int64(offset),
	})
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(res.Hits))
	for _, hit := range res.Hits {
		if m, ok := hit.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out, nil
}
