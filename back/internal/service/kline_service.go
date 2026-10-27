package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	tvws "github.com/fasthttp/websocket"
)

// KlineBar 单根 K 线，Time 为该 K 线开始时间 (Unix 秒, UTC)
type KlineBar struct {
	Time   int64   `json:"time"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume float64 `json:"volume"`
}

const (
	klineHistoryBars = 1000
	klineMaxBars     = 1200 // 实时推送不断追加新 K 线，超过后裁剪回 klineHistoryBars
	klineMaxSeries   = 12
	klineIdleTTL     = 2 * time.Minute
	klineLoadTimeout = 10 * time.Second
)

// KlineIntervals 支持的周期 (TradingView resolution：数字为分钟，1D/1W 为日线/周线)
var KlineIntervals = map[string]bool{"1": true, "15": true, "30": true, "60": true, "1D": true, "1W": true}

// ErrKlineBadRequest 标的或周期不在白名单内
var ErrKlineBadRequest = errors.New("不支持的标的或 K 线周期")

var (
	tvSplitRe     = regexp.MustCompile(`~m~\d+~m~`)
	tvHeartbeatRe = regexp.MustCompile(`~h~\d+`)
)

type klineKey struct {
	Symbol   string
	Interval string
}

// klineSeries 的全部字段都由 KlineManager.mu 保护
type klineSeries struct {
	key      klineKey
	csID     string
	bars     []KlineBar
	loaded   chan struct{}
	isLoaded bool
	err      error
	subs     map[*MarketClient]struct{}
	lastUsed time.Time
}

// KlineManager 按需维护一条独立的 TradingView 图表连接 (与行情报价连接隔离，图表协议出错不影响实时报价)。
// 匿名用户每个 chart session 只能挂 1 个 series，因此每个 (标的, 周期) 占用一个 chart session，并在所有查看者之间共享。
type KlineManager struct {
	hub     *MarketHub
	allowed map[string]bool

	dialMu  sync.Mutex
	writeMu sync.Mutex

	mu        sync.Mutex
	conn      *tvws.Conn
	series    map[klineKey]*klineSeries
	byCS      map[string]*klineSeries
	clientSub map[*MarketClient]*klineSeries
}

func NewKlineManager(hub *MarketHub, symbols []string) *KlineManager {
	m := &KlineManager{
		hub:       hub,
		allowed:   make(map[string]bool, len(symbols)),
		series:    make(map[klineKey]*klineSeries),
		byCS:      make(map[string]*klineSeries),
		clientSub: make(map[*MarketClient]*klineSeries),
	}
	for _, s := range symbols {
		m.allowed[s] = true
	}
	go m.janitor()
	return m
}

func (m *KlineManager) validate(symbol, interval string) (klineKey, error) {
	if !m.allowed[symbol] || !KlineIntervals[interval] {
		return klineKey{}, ErrKlineBadRequest
	}
	return klineKey{Symbol: symbol, Interval: interval}, nil
}

// GetBars 返回最近 limit 根 K 线 (按时间升序)
func (m *KlineManager) GetBars(symbol, interval string, limit int) ([]KlineBar, error) {
	key, err := m.validate(symbol, interval)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > klineHistoryBars {
		limit = klineHistoryBars
	}
	s, err := m.acquire(key)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	ch := s.loaded
	m.mu.Unlock()
	timedOut := false
	select {
	case <-ch:
	case <-time.After(klineLoadTimeout):
		timedOut = true
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if s.err != nil {
		return nil, s.err
	}
	if timedOut && len(s.bars) == 0 {
		return nil, errors.New("TradingView K 线数据加载超时，请稍后重试")
	}
	s.lastUsed = time.Now()
	start := 0
	if len(s.bars) > limit {
		start = len(s.bars) - limit
	}
	return append([]KlineBar(nil), s.bars[start:]...), nil
}

// Subscribe 让客户端接收该 (标的, 周期) 的实时 K 线更新；每个客户端同时只保留一个订阅
func (m *KlineManager) Subscribe(client *MarketClient, symbol, interval string) error {
	key, err := m.validate(symbol, interval)
	if err != nil {
		return err
	}
	s, err := m.acquire(key)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.series[key] != s {
		return errors.New("K 线订阅失败，请重试")
	}
	if old := m.clientSub[client]; old != nil && old != s {
		delete(old.subs, client)
		old.lastUsed = time.Now()
	}
	s.subs[client] = struct{}{}
	s.lastUsed = time.Now()
	m.clientSub[client] = s
	return nil
}

func (m *KlineManager) Unsubscribe(client *MarketClient) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s := m.clientSub[client]; s != nil {
		delete(s.subs, client)
		s.lastUsed = time.Now()
	}
	delete(m.clientSub, client)
}

func (m *KlineManager) acquire(key klineKey) (*klineSeries, error) {
	if err := m.ensureConn(); err != nil {
		return nil, fmt.Errorf("连接 TradingView 图表服务失败: %w", err)
	}

	m.mu.Lock()
	if s, ok := m.series[key]; ok {
		s.lastUsed = time.Now()
		m.mu.Unlock()
		return s, nil
	}
	conn := m.conn
	if conn == nil {
		m.mu.Unlock()
		return nil, errors.New("TradingView 图表连接刚刚中断，请重试")
	}
	var evicted string
	if len(m.series) >= klineMaxSeries {
		evicted = m.evictIdleLocked()
		if evicted == "" {
			m.mu.Unlock()
			return nil, errors.New("当前查看 K 线的标的过多，请稍后再试")
		}
	}
	s := &klineSeries{
		key:      key,
		csID:     "cs_" + randomString(12),
		loaded:   make(chan struct{}),
		subs:     make(map[*MarketClient]struct{}),
		lastUsed: time.Now(),
	}
	m.series[key] = s
	m.byCS[s.csID] = s
	m.mu.Unlock()

	if evicted != "" {
		m.send(conn, map[string]interface{}{"m": "chart_delete_session", "p": []string{evicted}})
	}
	symbolCfg, _ := json.Marshal(map[string]string{"symbol": key.Symbol, "adjustment": "splits", "session": "extended"})
	m.send(conn, map[string]interface{}{"m": "chart_create_session", "p": []string{s.csID, ""}})
	m.send(conn, map[string]interface{}{"m": "resolve_symbol", "p": []string{s.csID, "sds_sym_1", "=" + string(symbolCfg)}})
	m.send(conn, map[string]interface{}{"m": "create_series", "p": []interface{}{s.csID, "sds_1", "s1", "sds_sym_1", key.Interval, klineHistoryBars, ""}})
	return s, nil
}

// evictIdleLocked 释放最久未使用且无订阅者的 series，返回其 chart session ID (调用方负责通知 TradingView)
func (m *KlineManager) evictIdleLocked() string {
	var victim *klineSeries
	for _, s := range m.series {
		if len(s.subs) == 0 && (victim == nil || s.lastUsed.Before(victim.lastUsed)) {
			victim = s
		}
	}
	if victim == nil {
		return ""
	}
	m.removeLocked(victim, errors.New("K 线会话已释放"))
	return victim.csID
}

func (m *KlineManager) removeLocked(s *klineSeries, err error) {
	if m.series[s.key] == s {
		delete(m.series, s.key)
	}
	delete(m.byCS, s.csID)
	for c := range s.subs {
		if m.clientSub[c] == s {
			delete(m.clientSub, c)
		}
	}
	m.markLoadedLocked(s, err)
}

func (m *KlineManager) markLoadedLocked(s *klineSeries, err error) {
	if s.isLoaded {
		return
	}
	s.isLoaded = true
	s.err = err
	close(s.loaded)
}

func (m *KlineManager) ensureConn() error {
	m.dialMu.Lock()
	defer m.dialMu.Unlock()

	m.mu.Lock()
	ok := m.conn != nil
	m.mu.Unlock()
	if ok {
		return nil
	}

	headers := http.Header{}
	headers.Set("Origin", "https://cn.tradingview.com")
	headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	dialer := *tvws.DefaultDialer
	dialer.HandshakeTimeout = 10 * time.Second
	conn, _, err := dialer.Dial("wss://data.tradingview.com/socket.io/websocket", headers)
	if err != nil {
		return err
	}
	if err := m.send(conn, map[string]interface{}{"m": "set_auth_token", "p": []string{"unauthorized_user_token"}}); err != nil {
		_ = conn.Close()
		return err
	}

	m.mu.Lock()
	m.conn = conn
	m.mu.Unlock()
	log.Println("[Kline] 已建立 TradingView 图表连接")
	go m.readLoop(conn)
	return nil
}

func (m *KlineManager) send(conn *tvws.Conn, obj interface{}) error {
	var frame string
	if s, ok := obj.(string); ok {
		frame = formatTVRaw(s)
	} else {
		frame = formatTVMsg(obj)
	}
	m.writeMu.Lock()
	defer m.writeMu.Unlock()
	_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	err := conn.WriteMessage(tvws.TextMessage, []byte(frame))
	if err != nil {
		// 关闭后 readLoop 退出并统一清理状态
		_ = conn.Close()
	}
	return err
}

func (m *KlineManager) readLoop(conn *tvws.Conn) {
	defer m.onDisconnect(conn)
	for {
		_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[Kline] TradingView 图表连接结束: %v", err)
			return
		}
		str := string(msg)
		for _, hb := range tvHeartbeatRe.FindAllString(str, -1) {
			_ = m.send(conn, hb)
		}
		for _, part := range tvSplitRe.Split(str, -1) {
			if part == "" || strings.HasPrefix(part, "~h~") {
				continue
			}
			var pkt struct {
				M string            `json:"m"`
				P []json.RawMessage `json:"p"`
			}
			if json.Unmarshal([]byte(part), &pkt) != nil || len(pkt.P) == 0 {
				continue
			}
			if pkt.M == "protocol_error" {
				log.Printf("[Kline] TradingView 协议错误: %s", part)
				_ = conn.Close()
				return
			}
			m.handlePacket(pkt.M, pkt.P)
		}
	}
}

func (m *KlineManager) handlePacket(method string, p []json.RawMessage) {
	var csID string
	if json.Unmarshal(p[0], &csID) != nil || csID == "" {
		return
	}

	switch method {
	case "timescale_update", "du":
		if len(p) < 2 {
			return
		}
		bars := parseTVBars(p[1])
		if len(bars) == 0 {
			return
		}
		m.applyBars(csID, bars)
	case "series_completed":
		m.mu.Lock()
		if s := m.byCS[csID]; s != nil {
			m.markLoadedLocked(s, nil)
		}
		m.mu.Unlock()
	case "symbol_error", "series_error", "critical_error":
		detail := make([]string, 0, len(p)-1)
		for _, raw := range p[1:] {
			detail = append(detail, strings.Trim(string(raw), `"`))
		}
		m.mu.Lock()
		if s := m.byCS[csID]; s != nil {
			log.Printf("[Kline] %s %s/%s: %s", method, s.key.Symbol, s.key.Interval, strings.Join(detail, " "))
			m.removeLocked(s, fmt.Errorf("TradingView 返回错误 (%s)", method))
		}
		m.mu.Unlock()
	}
}

// parseTVBars 解析 {"sds_1":{"s":[{"i":0,"v":[time,open,high,low,close,volume]}]}}；指数类标的没有 volume
func parseTVBars(raw json.RawMessage) []KlineBar {
	var payload map[string]json.RawMessage
	if json.Unmarshal(raw, &payload) != nil {
		return nil
	}
	seriesRaw, ok := payload["sds_1"]
	if !ok {
		return nil
	}
	var series struct {
		S []struct {
			V []float64 `json:"v"`
		} `json:"s"`
	}
	if json.Unmarshal(seriesRaw, &series) != nil {
		return nil
	}
	bars := make([]KlineBar, 0, len(series.S))
	for _, item := range series.S {
		if len(item.V) < 5 {
			continue
		}
		b := KlineBar{Time: int64(item.V[0]), Open: item.V[1], High: item.V[2], Low: item.V[3], Close: item.V[4]}
		if len(item.V) > 5 {
			b.Volume = item.V[5]
		}
		bars = append(bars, b)
	}
	sort.Slice(bars, func(i, j int) bool { return bars[i].Time < bars[j].Time })
	return bars
}

// mergeBars 合并增量 K 线；incoming 覆盖到已有数据起点之前时视为整段重载
func mergeBars(existing, incoming []KlineBar) (merged []KlineBar, reloaded bool) {
	if len(existing) == 0 || incoming[0].Time <= existing[0].Time {
		merged = incoming
		reloaded = true
	} else {
		merged = existing
		for _, b := range incoming {
			n := len(merged)
			switch {
			case b.Time > merged[n-1].Time:
				merged = append(merged, b)
			case b.Time == merged[n-1].Time:
				merged[n-1] = b
			default:
				i := sort.Search(n, func(i int) bool { return merged[i].Time >= b.Time })
				if i < n && merged[i].Time == b.Time {
					merged[i] = b
				}
			}
		}
	}
	if len(merged) > klineMaxBars {
		merged = append([]KlineBar(nil), merged[len(merged)-klineHistoryBars:]...)
	}
	return merged, reloaded
}

func (m *KlineManager) applyBars(csID string, incoming []KlineBar) {
	m.mu.Lock()
	s := m.byCS[csID]
	if s == nil {
		m.mu.Unlock()
		return
	}
	var reloaded bool
	s.bars, reloaded = mergeBars(s.bars, incoming)
	subs := make([]*MarketClient, 0, len(s.subs))
	for c := range s.subs {
		subs = append(subs, c)
	}
	key := s.key
	m.mu.Unlock()

	if len(subs) == 0 {
		return
	}
	var msg map[string]interface{}
	if reloaded {
		msg = map[string]interface{}{"type": "kline_reset", "symbol": key.Symbol, "interval": key.Interval}
	} else {
		msg = map[string]interface{}{"type": "kline", "symbol": key.Symbol, "interval": key.Interval, "bars": incoming}
	}
	b, _ := json.Marshal(msg)
	for _, c := range subs {
		m.hub.SendTo(c, b)
	}
}

// onDisconnect 清空全部状态并通知订阅者重新拉取；下一次请求会按需重连
func (m *KlineManager) onDisconnect(conn *tvws.Conn) {
	_ = conn.Close()
	type note struct {
		c   *MarketClient
		key klineKey
	}
	var notes []note

	m.mu.Lock()
	if m.conn == conn {
		m.conn = nil
	}
	for _, s := range m.series {
		for c := range s.subs {
			notes = append(notes, note{c, s.key})
		}
		m.markLoadedLocked(s, errors.New("TradingView 图表连接中断，请重试"))
	}
	m.series = make(map[klineKey]*klineSeries)
	m.byCS = make(map[string]*klineSeries)
	m.clientSub = make(map[*MarketClient]*klineSeries)
	m.mu.Unlock()

	for _, n := range notes {
		b, _ := json.Marshal(map[string]interface{}{"type": "kline_reset", "symbol": n.key.Symbol, "interval": n.key.Interval})
		m.hub.SendTo(n.c, b)
	}
}

func (m *KlineManager) janitor() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		var expired []string

		m.mu.Lock()
		for _, s := range m.series {
			for c := range s.subs {
				if !m.hub.Has(c) {
					delete(s.subs, c)
					delete(m.clientSub, c)
					s.lastUsed = time.Now()
				}
			}
			if len(s.subs) == 0 && time.Since(s.lastUsed) > klineIdleTTL {
				expired = append(expired, s.csID)
				m.removeLocked(s, errors.New("K 线会话已释放"))
			}
		}
		conn := m.conn
		closeConn := conn != nil && len(m.series) == 0
		m.mu.Unlock()

		if conn == nil {
			continue
		}
		for _, cs := range expired {
			_ = m.send(conn, map[string]interface{}{"m": "chart_delete_session", "p": []string{cs}})
		}
		if closeConn {
			log.Println("[Kline] 无人查看 K 线，关闭 TradingView 图表连接")
			_ = conn.Close()
		}
	}
}
