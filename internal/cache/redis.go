package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"crm-backend/config"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client     *redis.Client
	isFallback bool
	memLock    sync.RWMutex
	memStore   map[string]memItem
}

type memItem struct {
	val       string
	expiresAt time.Time
}

var Rdb *RedisClient

func InitRedis(cfg *config.Config) (*RedisClient, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
		PoolSize: cfg.RedisPoolSize,
	})

	rc := &RedisClient{
		client:   rClient,
		memStore: make(map[string]memItem),
	}

	if err := rClient.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis Warning] Redis unavailable at %s (%v), activating high-performance In-Memory cache fallback", cfg.RedisAddr, err)
		rc.isFallback = true
	} else {
		log.Printf("[Redis] Connected successfully to %s, Connection Pool Size=%d", cfg.RedisAddr, cfg.RedisPoolSize)
	}

	Rdb = rc
	return rc, nil
}

func (r *RedisClient) Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error {
	bytes, err := json.Marshal(val)
	if err != nil {
		return err
	}

	if r.isFallback {
		r.memLock.Lock()
		defer r.memLock.Unlock()
		r.memStore[key] = memItem{
			val:       string(bytes),
			expiresAt: time.Now().Add(ttl),
		}
		return nil
	}

	return r.client.Set(ctx, key, string(bytes), ttl).Err()
}

func (r *RedisClient) Get(ctx context.Context, key string, target interface{}) error {
	if r.isFallback {
		r.memLock.RLock()
		defer r.memLock.RUnlock()
		item, exists := r.memStore[key]
		if !exists || time.Now().After(item.expiresAt) {
			return redis.Nil
		}
		return json.Unmarshal([]byte(item.val), target)
	}

	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(val), target)
}

func (r *RedisClient) Del(ctx context.Context, keys ...string) error {
	if r.isFallback {
		r.memLock.Lock()
		defer r.memLock.Unlock()
		for _, k := range keys {
			delete(r.memStore, k)
		}
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// User Permission Caching Helpers
func (r *RedisClient) SetUserPermissions(ctx context.Context, userID uint, perms []string) error {
	key := fmt.Sprintf("crm:perms:user:%d", userID)
	return r.Set(ctx, key, perms, 12*time.Hour)
}

func (r *RedisClient) GetUserPermissions(ctx context.Context, userID uint) ([]string, error) {
	key := fmt.Sprintf("crm:perms:user:%d", userID)
	var perms []string
	err := r.Get(ctx, key, &perms)
	return perms, err
}

func (r *RedisClient) InvalidateUserCache(ctx context.Context, userID uint) {
	key := fmt.Sprintf("crm:perms:user:%d", userID)
	menuKey := fmt.Sprintf("crm:menus:user:%d", userID)
	_ = r.Del(ctx, key, menuKey)
}
