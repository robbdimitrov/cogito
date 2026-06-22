package api

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/valkey-io/valkey-go"
)

// recordFailureLua atomically increments the counter and sets a TTL whenever
// none exists, so a key stranded without expiry (e.g. by a failed Clear) does
// not permanently lock out the account.
const recordFailureLua = `
local n = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return n
`

const throttleKeyPrefix = "login:"

type LoginFailure struct {
	Key   string
	Count int
}

type LoginThrottle interface {
	GetFailures(ctx context.Context, keys []string) ([]LoginFailure, error)
	RecordFailure(ctx context.Context, key string) error
	Clear(ctx context.Context, keys []string) error
}

type DragonflyLoginThrottle struct {
	client valkey.Client
	script *valkey.Lua
	window time.Duration
}

func NewDragonflyLoginThrottle() (*DragonflyLoginThrottle, error) {
	url := os.Getenv("DRAGONFLY_URL")
	addr := parseDragonflyAddr(url)
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{addr}})
	if err != nil {
		return nil, err
	}
	window := time.Duration(envInt("THROTTLE_WINDOW_SECS", 900)) * time.Second
	return &DragonflyLoginThrottle{
		client: client,
		script: valkey.NewLuaScript(recordFailureLua),
		window: window,
	}, nil
}

func prefixKeys(keys []string) []string {
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = throttleKeyPrefix + k
	}
	return out
}

func (t *DragonflyLoginThrottle) GetFailures(ctx context.Context, keys []string) ([]LoginFailure, error) {
	res, err := t.client.Do(ctx, t.client.B().Mget().Key(prefixKeys(keys)...).Build()).ToArray()
	if err != nil {
		return nil, err
	}
	var failures []LoginFailure
	for i, msg := range res {
		s, err := msg.ToString()
		if err != nil {
			continue
		}
		count, err := strconv.Atoi(s)
		if err != nil || count <= 0 {
			continue
		}
		failures = append(failures, LoginFailure{Key: keys[i], Count: count})
	}
	return failures, nil
}

func (t *DragonflyLoginThrottle) RecordFailure(ctx context.Context, key string) error {
	windowMs := strconv.FormatInt(t.window.Milliseconds(), 10)
	return t.script.Exec(ctx, t.client,
		[]string{throttleKeyPrefix + key},
		[]string{windowMs},
	).Error()
}

func (t *DragonflyLoginThrottle) Clear(ctx context.Context, keys []string) error {
	return t.client.Do(ctx, t.client.B().Del().Key(prefixKeys(keys)...).Build()).Error()
}

type NoopLoginThrottle struct{}

func (NoopLoginThrottle) GetFailures(_ context.Context, _ []string) ([]LoginFailure, error) {
	return nil, nil
}

func (NoopLoginThrottle) RecordFailure(_ context.Context, _ string) error { return nil }
func (NoopLoginThrottle) Clear(_ context.Context, _ []string) error       { return nil }

func loginFailureKeys(r *http.Request, email string) []string {
	return []string{"ip:" + clientIP(r), "email:" + email}
}

func loginRateLimited(failures []LoginFailure, ipThreshold, emailThreshold int) bool {
	for _, f := range failures {
		threshold := ipThreshold
		if strings.HasPrefix(f.Key, "email:") {
			threshold = emailThreshold
		}
		if f.Count >= threshold {
			return true
		}
	}
	return false
}
