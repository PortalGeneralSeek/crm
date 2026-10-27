package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"

	tvws "github.com/fasthttp/websocket"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// K 线本地归档：TradingView 匿名账户只能往回翻有限的历史 (1 分钟约 5 天、1 小时约 1.5 年)，
// 且以后可能完全拿不到，因此后台定时把所有标的、所有周期的 K 线增量写入 crm_market_klines，
// 历史翻页与 TradingView 不可用时的兜底都从归档读取。
const (
	klineArchivePageBars  = 5000
	klineArchiveMaxPage   = 5000
	klineArchiveBatch     = 500
	klineArchiveMaxRounds = 60
	klineArchiveTick      = 10 * time.Minute
	klineArchiveReadWait  = 25 * time.Second
	klineArchiveKeyPause  = 400 * time.Millisecond
)

// klineArchiveFloor 首次回填至少追溯到的日期；日线/周线首屏 5000 根通常已早于该日期
var klineArchiveFloor = time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC).Unix()

var klineArchiveIntervals = []string{"1D", "1W", "60", "30", "15", "1"}

// 1 分钟线在 TradingView 只保留约 5 天，同步间隔必须远小于该窗口
var klineArchiveCadence = map[string]time.Duration{
	"1":  30 * time.Minute,
	"15": time.Hour,
	"30": time.Hour,
	"60": time.Hour,
	"1D": 6 * time.Hour,
	"1W": 12 * time.Hour,
}

func klineIntervalSeconds(interval string) int64 {
	switch interval {
	case "1D":
		return 86400
	case "1W":
		return 7 * 86400
	}
	n, err := strconv.ParseInt(interval, 10, 64)
	if err != nil || n <= 0 {
		return 60
	}
	return n * 60
}

// 归档写入很慢 (远程 OceanBase 单批数百毫秒)，GORM 的慢 SQL 日志会把整条批量 INSERT 打进日志，这里静默，错误照常返回
func klineArchiveDB() *gorm.DB {
	return database.DB.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})
}

type klineArchiveRange struct {
	Earliest int64
	Latest   int64
	Count    int64
}

func archivedKlineRange(key klineKey) (klineArchiveRange, error) {
	var r struct {
		Earliest *int64
		Latest   *int64
		Count    int64
	}
	err := klineArchiveDB().Model(&model.CrmMarketKline{}).
		Select("MIN(bar_time) AS earliest, MAX(bar_time) AS latest, COUNT(*) AS count").
		Where("symbol = ? AND resolution = ?", key.Symbol, key.Interval).
		Scan(&r).Error
	if err != nil {
		return klineArchiveRange{}, err
	}
	out := klineArchiveRange{Count: r.Count}
	if r.Earliest != nil {
		out.Earliest = *r.Earliest
	}
	if r.Latest != nil {
		out.Latest = *r.Latest
	}
	return out, nil
}

// loadArchivedKlines 返回 before 之前 (before<=0 表示最新) 的 limit 根归档 K 线，按时间升序
func loadArchivedKlines(key klineKey, before int64, limit int) ([]KlineBar, error) {
	q := klineArchiveDB().Where("symbol = ? AND resolution = ?", key.Symbol, key.Interval)
	if before > 0 {
		q = q.Where("bar_time < ?", before)
	}
	var rows []model.CrmMarketKline
	if err := q.Order("bar_time DESC").Limit(limit).Find(&rows).Error; err != nil {
		return nil, err
	}
	bars := make([]KlineBar, len(rows))
	for i, r := range rows {
		bars[len(rows)-1-i] = KlineBar{Time: r.BarTime, Open: r.Open, High: r.High, Low: r.Low, Close: r.Close, Volume: r.Volume}
	}
	return bars, nil
}

func upsertArchivedKlines(key klineKey, bars []KlineBar) error {
	if len(bars) == 0 {
		return nil
	}
	now := time.Now()
	rows := make([]model.CrmMarketKline, len(bars))
	for i, b := range bars {
		rows[i] = model.CrmMarketKline{
			Symbol: key.Symbol, Resolution: key.Interval, BarTime: b.Time,
			Open: b.Open, High: b.High, Low: b.Low, Close: b.Close, Volume: b.Volume, UpdatedAt: now,
		}
	}
	return klineArchiveDB().Clauses(clause.OnConflict{UpdateAll: true}).CreateInBatches(rows, klineArchiveBatch).Error
}

// barsToArchive 只挑出归档里还没有的 K 线：比已归档最早的更早，或从已归档最新一根 (可能未收盘) 开始往后。
// 中间段已经落库，重复写入只会给远程数据库增加负担。
func barsToArchive(bars []KlineBar, r klineArchiveRange) []KlineBar {
	if r.Count == 0 {
		return bars
	}
	out := make([]KlineBar, 0, len(bars))
	for _, b := range bars {
		if b.Time < r.Earliest || b.Time >= r.Latest {
			out = append(out, b)
		}
	}
	return out
}

// tvHistoryConn 归档专用的 TradingView 图表连接，同步地一个 series 接一个 series 拉取，与页面实时 K 线连接互不影响
type tvHistoryConn struct {
	conn *tvws.Conn
}

func dialTVHistory() (*tvHistoryConn, error) {
	headers := http.Header{}
	headers.Set("Origin", "https://cn.tradingview.com")
	headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	dialer := *tvws.DefaultDialer
	dialer.HandshakeTimeout = 10 * time.Second
	conn, _, err := dialer.Dial("wss://data.tradingview.com/socket.io/websocket", headers)
	if err != nil {
		return nil, err
	}
	c := &tvHistoryConn{conn: conn}
	if err := c.send(map[string]interface{}{"m": "set_auth_token", "p": []string{"unauthorized_user_token"}}); err != nil {
		_ = conn.Close()
		return nil, err
	}
	return c, nil
}

func (c *tvHistoryConn) Close() { _ = c.conn.Close() }

func (c *tvHistoryConn) send(obj interface{}) error {
	var frame string
	if s, ok := obj.(string); ok {
		frame = formatTVRaw(s)
	} else {
		frame = formatTVMsg(obj)
	}
	_ = c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	return c.conn.WriteMessage(tvws.TextMessage, []byte(frame))
}

// fetch 先取 initial 根，再用 request_more_data 往前翻页，直到最早一根 <= stopAt、TradingView 不再返回更早的数据或达到 maxRounds
func (c *tvHistoryConn) fetch(key klineKey, initial int, stopAt int64, maxRounds int) ([]KlineBar, error) {
	cs := "cs_" + randomString(12)
	symbolCfg, _ := json.Marshal(map[string]string{"symbol": key.Symbol, "adjustment": "splits", "session": "extended"})
	for _, msg := range []interface{}{
		map[string]interface{}{"m": "chart_create_session", "p": []string{cs, ""}},
		map[string]interface{}{"m": "resolve_symbol", "p": []string{cs, "sds_sym_1", "=" + string(symbolCfg)}},
		map[string]interface{}{"m": "create_series", "p": []interface{}{cs, "sds_1", "s1", "sds_sym_1", key.Interval, initial, ""}},
	} {
		if err := c.send(msg); err != nil {
			return nil, err
		}
	}
	defer c.send(map[string]interface{}{"m": "chart_delete_session", "p": []string{cs}})
	// 增量同步的首屏很小，翻页沿用相近的粒度，避免为补几根 K 线拉回数千根
	pageBars := min(max(initial, 100), klineArchivePageBars)

	byTime := make(map[int64]KlineBar)
	earliest := int64(1<<62 - 1)
	prevEarliest := earliest
	rounds := 0
	for {
		_ = c.conn.SetReadDeadline(time.Now().Add(klineArchiveReadWait))
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			return nil, err
		}
		str := string(raw)
		for _, hb := range tvHeartbeatRe.FindAllString(str, -1) {
			if err := c.send(hb); err != nil {
				return nil, err
			}
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
				return nil, fmt.Errorf("TradingView 协议错误: %s", part)
			}
			var id string
			if json.Unmarshal(pkt.P[0], &id) != nil || id != cs {
				continue
			}
			switch pkt.M {
			case "timescale_update", "du":
				if len(pkt.P) < 2 {
					continue
				}
				for _, b := range parseTVBars(pkt.P[1]) {
					byTime[b.Time] = b
					if b.Time < earliest {
						earliest = b.Time
					}
				}
			case "series_completed":
				rounds++
				if len(byTime) == 0 || earliest <= stopAt || earliest >= prevEarliest || rounds >= maxRounds {
					bars := make([]KlineBar, 0, len(byTime))
					for _, b := range byTime {
						bars = append(bars, b)
					}
					sort.Slice(bars, func(i, j int) bool { return bars[i].Time < bars[j].Time })
					return bars, nil
				}
				prevEarliest = earliest
				if err := c.send(map[string]interface{}{"m": "request_more_data", "p": []interface{}{cs, "sds_1", pageBars}}); err != nil {
					return nil, err
				}
			case "symbol_error", "series_error", "critical_error":
				return nil, fmt.Errorf("TradingView 返回 %s: %s", pkt.M, part)
			}
		}
	}
}

// KlineArchiver 后台归档所有标的、所有周期的 K 线
type KlineArchiver struct {
	symbols []string

	mu         sync.Mutex
	lastSync   map[klineKey]time.Time
	backfilled map[klineKey]bool
}

func NewKlineArchiver(symbols []string) *KlineArchiver {
	return &KlineArchiver{
		symbols:    symbols,
		lastSync:   make(map[klineKey]time.Time),
		backfilled: make(map[klineKey]bool),
	}
}

func (a *KlineArchiver) Start() {
	go func() {
		// 避开启动时行情、快讯连接集中建立的高峰
		time.Sleep(20 * time.Second)
		for {
			a.runCycle()
			time.Sleep(klineArchiveTick)
		}
	}()
}

func (a *KlineArchiver) dueKeys(now time.Time) []klineKey {
	a.mu.Lock()
	defer a.mu.Unlock()
	var keys []klineKey
	for _, iv := range klineArchiveIntervals {
		for _, sym := range a.symbols {
			k := klineKey{Symbol: sym, Interval: iv}
			if last, ok := a.lastSync[k]; ok && now.Sub(last) < klineArchiveCadence[iv]-time.Minute {
				continue
			}
			keys = append(keys, k)
		}
	}
	return keys
}

func (a *KlineArchiver) runCycle() {
	if database.DB == nil {
		return
	}
	keys := a.dueKeys(time.Now())
	if len(keys) == 0 {
		return
	}
	started := time.Now()
	var conn *tvHistoryConn
	defer func() {
		if conn != nil {
			conn.Close()
		}
	}()

	var written, failed int
	for _, key := range keys {
		if conn == nil {
			c, err := dialTVHistory()
			if err != nil {
				log.Printf("[K线归档] 连接 TradingView 失败，本轮剩余 %d 项下轮再试: %v", len(keys), err)
				return
			}
			conn = c
		}
		n, err := a.syncKey(conn, key)
		if err != nil {
			failed++
			log.Printf("[K线归档] %s/%s 同步失败: %v", key.Symbol, key.Interval, err)
			// 读写出错后连接状态未知，丢弃重拨
			conn.Close()
			conn = nil
		}
		written += n
		time.Sleep(klineArchiveKeyPause)
	}
	log.Printf("[K线归档] 本轮完成 %d 项 (失败 %d)，新写入 %d 根，耗时 %s", len(keys), failed, written, time.Since(started).Round(time.Second))
}

func (a *KlineArchiver) syncKey(conn *tvHistoryConn, key klineKey) (int, error) {
	r, err := archivedKlineRange(key)
	if err != nil {
		return 0, fmt.Errorf("读取归档区间失败: %w", err)
	}
	a.mu.Lock()
	deep := !a.backfilled[key]
	a.mu.Unlock()

	initial, stopAt, maxRounds := klineArchivePageBars, klineArchiveFloor, klineArchiveMaxRounds
	if r.Count > 0 && (!deep || r.Earliest <= klineArchiveFloor) {
		// 增量：按距上次归档的时长估算缺口 (休市时段会多估，不影响正确性)，不够再翻页直到接上
		gap := (time.Now().Unix()-r.Latest)/klineIntervalSeconds(key.Interval) + 5
		initial = int(min(max(gap, 10), klineArchiveMaxPage))
		stopAt = r.Latest
		deep = false
	}
	bars, err := conn.fetch(key, initial, stopAt, maxRounds)
	if err != nil {
		return 0, err
	}
	if len(bars) == 0 {
		return 0, errors.New("TradingView 未返回任何 K 线")
	}
	fresh := barsToArchive(bars, r)
	if err := upsertArchivedKlines(key, fresh); err != nil {
		return 0, fmt.Errorf("写入归档失败: %w", err)
	}

	a.mu.Lock()
	a.lastSync[key] = time.Now()
	a.backfilled[key] = true
	a.mu.Unlock()

	if deep || len(fresh) > 50 {
		earliest := bars[0].Time
		if r.Count > 0 && r.Earliest < earliest {
			earliest = r.Earliest
		}
		log.Printf("[K线归档] %s/%s 拉取 %d 根，新写入 %d 根，归档起点 %s",
			key.Symbol, key.Interval, len(bars), len(fresh), time.Unix(earliest, 0).In(beijingLoc).Format("2006-01-02 15:04"))
	}
	return len(fresh), nil
}
