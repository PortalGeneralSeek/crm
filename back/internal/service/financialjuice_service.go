package service

import (
	"bufio"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	tvws "github.com/fasthttp/websocket"
)

// FinancialJuice 实时快讯链路说明：
//   - 页面主体新闻由前端 WebSocket 动态渲染，静态拉取 /home 拿不到内容；
//   - 频繁 HTTP 轮询页面或 feed.ashx 会触发 Cloudflare 1015 (429) 限流，
//     因此 RSS 仅在启动时拉取一次用作去重基准，实时数据全部走 Centrifugo v5 WebSocket。
const (
	fjTokenURL     = "https://www.financialjuice.com/widgets/centrifugo-token.ashx"
	fjRSSURL       = "https://www.financialjuice.com/feed.ashx?xy=rss"
	fjWSURL        = "wss://rt.financialjuice.com/connection/websocket"
	fjOrigin       = "https://www.financialjuice.com"
	fjUserAgent    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	fjBaselineSize = 100
	fjRecentLimit  = 200
	fjSource       = "FinancialJuice"
)

var errFJRateLimited = errors.New("FinancialJuice 返回 429 限流 (Cloudflare 1015)")

type fjConfig struct {
	Enabled        bool
	ReportInterval time.Duration
	OutputPath     string
	LogPath        string
	FallbackToken  string
}

func loadFJConfig() fjConfig {
	cfg := fjConfig{
		Enabled:        true,
		ReportInterval: 10 * time.Second,
		OutputPath:     envOr("FJ_OUTPUT_PATH", "financialjuice_news.jsonl"),
		LogPath:        envOr("FJ_LOG_PATH", "financialjuice_monitor.log"),
		FallbackToken:  os.Getenv("FJ_TOKEN"),
	}
	if v := strings.ToLower(os.Getenv("FJ_ENABLED")); v == "false" || v == "0" || v == "off" {
		cfg.Enabled = false
	}
	if v, err := strconv.Atoi(os.Getenv("FJ_REPORT_INTERVAL")); err == nil && v > 0 {
		cfg.ReportInterval = time.Duration(v) * time.Second
	}
	return cfg
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

// NewsStreamStatus 快讯数据流连接状态 (供前端展示)
type NewsStreamStatus struct {
	Source         string `json:"source"`
	Status         string `json:"status"` // connecting | connected | reconnecting | disabled
	StatusText     string `json:"statusText"`
	ClientID       string `json:"clientId,omitempty"`
	ConnectedSince string `json:"connectedSince,omitempty"`
	LastMessageAt  string `json:"lastMessageAt,omitempty"`
	Reconnects     int    `json:"reconnects"`
	BaselineCount  int    `json:"baselineCount"`
	RealtimeCount  int64  `json:"realtimeCount"`
	TotalTracked   int    `json:"totalTracked"`
	Round          int64  `json:"round"`
	LastError      string `json:"lastError,omitempty"`
}

type fjRawNews struct {
	NewsID        int64             `json:"NewsID"`
	Title         string            `json:"Title"`
	Description   string            `json:"Description"`
	DatePublished string            `json:"DatePublished"`
	PostedShort   string            `json:"PostedShort"`
	Breaking      bool              `json:"Breaking"`
	Level         string            `json:"Level"`
	EURL          string            `json:"EURL"`
	FCName        string            `json:"FCName"`
	Labels        []json.RawMessage `json:"Labels"`
	Tags          []json.RawMessage `json:"Tags"`
}

type cfReply struct {
	ID    uint32 `json:"id"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	Connect *struct {
		Client  string                     `json:"client"`
		Version string                     `json:"version"`
		Expires bool                       `json:"expires"`
		TTL     int                        `json:"ttl"`
		Ping    int                        `json:"ping"`
		Subs    map[string]json.RawMessage `json:"subs"`
	} `json:"connect"`
	Refresh *struct {
		Expires bool `json:"expires"`
		TTL     int  `json:"ttl"`
	} `json:"refresh"`
	Push *struct {
		Channel string `json:"channel"`
		Pub     *struct {
			Data json.RawMessage `json:"data"`
		} `json:"pub"`
		Disconnect *struct {
			Code   int    `json:"code"`
			Reason string `json:"reason"`
		} `json:"disconnect"`
	} `json:"push"`
}

// FinancialJuiceMonitor 维持与 FinancialJuice 的 Centrifugo 长连接，
// 新快讯一到达即推送给前端，同时按固定周期输出详细监控报告日志。
type FinancialJuiceMonitor struct {
	cfg  fjConfig
	hub  *MarketHub
	http *http.Client

	logMu   sync.Mutex
	logOut  io.Writer
	outMu   sync.Mutex
	outFile *os.File

	mu            sync.RWMutex
	seen          map[int64]struct{}
	recent        []NewsItem // 按 NewsID 倒序 (最新在前)
	buffer        []NewsItem // 上次周期报告之后的新增
	status        string
	lastError     string
	clientID      string
	connectedAt   time.Time
	lastMsgAt     time.Time
	reconnects    int
	baselineCount int
	realtimeCount int64
	round         int64
	unknownEvents map[string]bool

	macro *FJMacroTracker
}

func NewFinancialJuiceMonitor(hub *MarketHub) *FinancialJuiceMonitor {
	m := &FinancialJuiceMonitor{
		cfg:           loadFJConfig(),
		hub:           hub,
		http:          &http.Client{Timeout: 20 * time.Second},
		logOut:        os.Stdout,
		seen:          make(map[int64]struct{}),
		status:        "connecting",
		unknownEvents: make(map[string]bool),
	}
	m.macro = newFJMacroTracker(m)
	return m
}

func (m *FinancialJuiceMonitor) Macro() *FJMacroTracker {
	return m.macro
}

func (m *FinancialJuiceMonitor) Start() {
	if !m.cfg.Enabled {
		m.mu.Lock()
		m.status = "disabled"
		m.mu.Unlock()
		log.Println("[FinancialJuice] FJ_ENABLED=false，实时快讯监控已关闭")
		return
	}
	if f, err := os.OpenFile(m.cfg.LogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644); err == nil {
		m.logOut = io.MultiWriter(os.Stdout, f)
	} else {
		log.Printf("[FinancialJuice] 无法打开日志文件 %s: %v，仅输出到终端", m.cfg.LogPath, err)
	}
	if f, err := os.OpenFile(m.cfg.OutputPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644); err == nil {
		m.outFile = f
	} else {
		m.logf("无法打开 JSONL 输出文件 %s: %v，新增快讯将不会持久化", m.cfg.OutputPath, err)
	}
	m.logf("实时快讯监控启动 | 报告周期=%v | JSONL=%s | 日志=%s", m.cfg.ReportInterval, m.cfg.OutputPath, m.cfg.LogPath)

	go func() {
		m.loadHistory()
		// 必须先于 RSS 基准载入缓存：基准补录会触发 saveCache，顺序颠倒会覆盖掉缓存
		m.macro.loadCache()
		m.buildBaseline()
		go m.reportLoop()
		// CPI/PPI 回补排在 RSS 基准之后串行发起，避免启动瞬间对 FinancialJuice 并发请求
		go m.macro.run()
		m.streamLoop()
	}()
}

func (m *FinancialJuiceMonitor) logf(format string, args ...interface{}) {
	line := fmt.Sprintf("%s [FinancialJuice] %s\n", beijingNow().Format("2006-01-02 15:04:05"), fmt.Sprintf(format, args...))
	m.logMu.Lock()
	_, _ = io.WriteString(m.logOut, line)
	m.logMu.Unlock()
}

func (m *FinancialJuiceMonitor) logBlock(block string) {
	m.logMu.Lock()
	_, _ = io.WriteString(m.logOut, block)
	m.logMu.Unlock()
}

// loadHistory 从 JSONL 恢复最近的快讯，重启后页面不至于空白，且历史条目不会被重复判为新增
func (m *FinancialJuiceMonitor) loadHistory() {
	f, err := os.Open(m.cfg.OutputPath)
	if err != nil {
		return
	}
	defer f.Close()

	var items []NewsItem
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 64*1024), 4*1024*1024)
	for sc.Scan() {
		var it NewsItem
		if json.Unmarshal(sc.Bytes(), &it) == nil && it.ID > 0 {
			if !strings.HasSuffix(it.URL, ".aspx") {
				it.URL = fjNewsURL(it.ID, it.Title)
			}
			// JSONL 中的研判结果可能来自旧版规则，按当前规则重新研判
			applyNewsAnalysis(&it, analyzeNewsHeadline(it.Title, it.Breaking))
			items = append(items, it)
			if len(items) > fjRecentLimit*2 {
				items = items[len(items)-fjRecentLimit:]
			}
		}
	}
	m.mu.Lock()
	for _, it := range items {
		if _, ok := m.seen[it.ID]; ok {
			continue
		}
		m.seen[it.ID] = struct{}{}
		m.recent = append(m.recent, it)
	}
	m.sortRecentLocked()
	m.mu.Unlock()
	if len(items) > 0 {
		m.logf("已从 %s 恢复 %d 条历史快讯", m.cfg.OutputPath, len(items))
	}
}

// buildBaseline 启动时单次拉取 RSS 最新 100 条，仅作为去重基准，不计入新增报告也不写入 JSONL
func (m *FinancialJuiceMonitor) buildBaseline() {
	var items []NewsItem
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		items, err = m.fetchRSS()
		if err == nil {
			break
		}
		wait := time.Duration(attempt*5) * time.Second
		if errors.Is(err, errFJRateLimited) {
			wait = time.Duration(attempt*60) * time.Second
		}
		m.logf("RSS 基准库拉取失败 (第 %d/3 次): %v，%v 后重试", attempt, err, wait)
		time.Sleep(wait)
	}
	if err != nil {
		m.logf("RSS 基准库建立失败，将仅依赖 WebSocket 推送去重: %v", err)
		return
	}

	m.mu.Lock()
	added := 0
	for _, it := range items {
		if _, ok := m.seen[it.ID]; ok {
			continue
		}
		m.seen[it.ID] = struct{}{}
		m.recent = append(m.recent, it)
		added++
	}
	m.baselineCount = len(items)
	m.sortRecentLocked()
	total := len(m.seen)
	m.mu.Unlock()
	m.macro.AddBaseline(items)
	m.logf("RSS 基准库建立完成: 拉取 %d 条，新增入库 %d 条，当前去重集合 %d 条 (基准数据不计入新增报告)", len(items), added, total)
}

func (m *FinancialJuiceMonitor) fetchRSS() ([]NewsItem, error) {
	body, err := m.httpGet(fjRSSURL, 8<<20)
	if err != nil {
		return nil, err
	}
	var rss struct {
		Channel struct {
			Items []struct {
				Title   string `xml:"title"`
				Link    string `xml:"link"`
				PubDate string `xml:"pubDate"`
				GUID    string `xml:"guid"`
			} `xml:"item"`
		} `xml:"channel"`
	}
	if err := xml.Unmarshal(body, &rss); err != nil {
		return nil, fmt.Errorf("解析 RSS 失败: %w", err)
	}
	var out []NewsItem
	for _, it := range rss.Channel.Items {
		if len(out) >= fjBaselineSize {
			break
		}
		id, err := strconv.ParseInt(strings.TrimSpace(it.GUID), 10, 64)
		if err != nil || id <= 0 {
			continue
		}
		published, _ := time.Parse(time.RFC1123, strings.TrimSpace(it.PubDate))
		item := m.buildItem(fjRawNews{
			NewsID: id,
			Title:  strings.TrimSpace(strings.TrimPrefix(it.Title, "FinancialJuice:")),
		}, published)
		item.Baseline = true
		item.Alert = false
		out = append(out, item)
	}
	return out, nil
}

func (m *FinancialJuiceMonitor) httpGet(url string, limit int64) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", fjUserAgent)
	req.Header.Set("Referer", fjOrigin+"/home")
	resp, err := m.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, errFJRateLimited
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, limit))
}

func (m *FinancialJuiceMonitor) fetchToken() (string, error) {
	body, err := m.httpGet(fjTokenURL, 64<<10)
	if err == nil {
		var r struct {
			Token string `json:"token"`
		}
		if jerr := json.Unmarshal(body, &r); jerr == nil && r.Token != "" {
			return r.Token, nil
		}
		err = fmt.Errorf("响应中没有 token 字段")
	}
	if m.cfg.FallbackToken != "" {
		m.logf("Token 接口异常 (%v)，改用 FJ_TOKEN 环境变量中的备用 Token", err)
		return m.cfg.FallbackToken, nil
	}
	return "", err
}

func (m *FinancialJuiceMonitor) streamLoop() {
	backoff := 2 * time.Second
	for {
		m.setStatus("connecting", "")
		started := time.Now()
		connected, err := m.runSession()

		m.mu.Lock()
		m.clientID = ""
		m.connectedAt = time.Time{}
		m.reconnects++
		m.mu.Unlock()

		if connected && time.Since(started) > time.Minute {
			backoff = 2 * time.Second
		}
		wait := backoff
		if errors.Is(err, errFJRateLimited) && wait < time.Minute {
			wait = time.Minute
		}
		msg := "连接结束"
		if err != nil {
			msg = err.Error()
		}
		m.setStatus("reconnecting", msg)
		m.logf("WebSocket 断开: %s，%v 后自动重新获取 Token 并重连", msg, wait)
		time.Sleep(wait)
		if backoff < time.Minute {
			backoff *= 2
		}
	}
}

func (m *FinancialJuiceMonitor) runSession() (connected bool, err error) {
	token, err := m.fetchToken()
	if err != nil {
		return false, fmt.Errorf("获取 Centrifugo Token 失败: %w", err)
	}

	headers := http.Header{}
	headers.Set("Origin", fjOrigin)
	headers.Set("User-Agent", fjUserAgent)
	dialer := tvws.Dialer{HandshakeTimeout: 15 * time.Second, Proxy: http.ProxyFromEnvironment}
	conn, resp, err := dialer.Dial(fjWSURL, headers)
	if err != nil {
		if resp != nil {
			if resp.StatusCode == http.StatusTooManyRequests {
				return false, errFJRateLimited
			}
			return false, fmt.Errorf("WebSocket 握手失败 HTTP %d: %w", resp.StatusCode, err)
		}
		return false, fmt.Errorf("WebSocket 拨号失败: %w", err)
	}
	defer conn.Close()

	var writeMu sync.Mutex
	write := func(b []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		return conn.WriteMessage(tvws.TextMessage, b)
	}
	var nextID uint32 = 1
	connectCmd, _ := json.Marshal(map[string]interface{}{"id": 1, "connect": map[string]string{"token": token}})
	if err := write(connectCmd); err != nil {
		return false, fmt.Errorf("发送 connect 指令失败: %w", err)
	}

	pingInterval := 25 * time.Second
	var refreshTimer *time.Timer
	defer func() {
		if refreshTimer != nil {
			refreshTimer.Stop()
		}
	}()
	// Token 到期前 60 秒用 refresh 指令续期；续期失败则主动断开，交给外层重连逻辑重新取 Token
	scheduleRefresh := func(ttl int) {
		if ttl <= 0 {
			return
		}
		delay := time.Duration(ttl)*time.Second - time.Minute
		if delay < 5*time.Second {
			delay = 5 * time.Second
		}
		if refreshTimer != nil {
			refreshTimer.Stop()
		}
		refreshTimer = time.AfterFunc(delay, func() {
			newToken, err := m.fetchToken()
			if err != nil {
				m.logf("Token 续期失败: %v，主动断开以重新连接", err)
				_ = conn.Close()
				return
			}
			id := atomic.AddUint32(&nextID, 1)
			b, _ := json.Marshal(map[string]interface{}{"id": id, "refresh": map[string]string{"token": newToken}})
			if err := write(b); err != nil {
				_ = conn.Close()
			}
		})
	}

	for {
		_ = conn.SetReadDeadline(time.Now().Add(pingInterval + 20*time.Second))
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return connected, fmt.Errorf("读取数据中断: %w", err)
		}
		m.mu.Lock()
		m.lastMsgAt = time.Now()
		m.mu.Unlock()

		// Centrifugo JSON 协议允许一帧内携带多条以换行分隔的消息
		for _, line := range bytes.Split(msg, []byte("\n")) {
			line = bytes.TrimSpace(line)
			if len(line) == 0 {
				continue
			}
			if string(line) == "{}" {
				if err := write([]byte("{}")); err != nil {
					return connected, fmt.Errorf("回传心跳失败: %w", err)
				}
				continue
			}
			var r cfReply
			if err := json.Unmarshal(line, &r); err != nil {
				continue
			}
			switch {
			case r.Error != nil:
				return connected, fmt.Errorf("服务端返回错误 code=%d: %s", r.Error.Code, r.Error.Message)
			case r.Connect != nil:
				connected = true
				if r.Connect.Ping > 0 {
					pingInterval = time.Duration(r.Connect.Ping) * time.Second
				}
				subs := make([]string, 0, len(r.Connect.Subs))
				for ch := range r.Connect.Subs {
					subs = append(subs, ch)
				}
				sort.Strings(subs)
				m.mu.Lock()
				m.clientID = r.Connect.Client
				m.connectedAt = time.Now()
				m.mu.Unlock()
				m.setStatus("connected", "")
				m.logf("WebSocket 已连接 | client=%s | Centrifugo v%s | 订阅频道=%s | Token TTL=%ds | 心跳=%v",
					r.Connect.Client, r.Connect.Version, strings.Join(subs, ","), r.Connect.TTL, pingInterval)
				if r.Connect.Expires {
					scheduleRefresh(r.Connect.TTL)
				}
			case r.Refresh != nil:
				m.logf("Token 续期成功，新 TTL=%ds", r.Refresh.TTL)
				if r.Refresh.Expires {
					scheduleRefresh(r.Refresh.TTL)
				}
			case r.Push != nil:
				if r.Push.Disconnect != nil {
					return connected, fmt.Errorf("服务端要求断开 code=%d: %s", r.Push.Disconnect.Code, r.Push.Disconnect.Reason)
				}
				if r.Push.Pub != nil {
					m.handlePublication(r.Push.Channel, r.Push.Pub.Data)
				}
			}
		}
	}
}

func (m *FinancialJuiceMonitor) handlePublication(channel string, data json.RawMessage) {
	var env struct {
		Ev  string          `json:"ev"`
		Msg json.RawMessage `json:"msg"`
	}
	payload := []byte(data)
	if json.Unmarshal(data, &env) == nil && len(env.Msg) > 0 {
		payload = env.Msg
		// msg 字段通常是被再次 JSON 编码的字符串
		var inner string
		if json.Unmarshal(env.Msg, &inner) == nil {
			payload = []byte(inner)
		}
	}
	items := parseFJItems(payload)
	if len(items) == 0 {
		handled := strings.Contains(env.Ev, "Calendar") && m.macro.OnCalendarEvent(payload)
		m.mu.Lock()
		first := !m.unknownEvents[env.Ev]
		m.unknownEvents[env.Ev] = true
		m.mu.Unlock()
		if first && !handled {
			sample := string(payload)
			if len(sample) > 600 {
				sample = sample[:600] + "..."
			}
			m.logf("频道 %s 收到未包含快讯的事件 ev=%q，已忽略 (同类事件仅提示一次)，样例: %s", channel, env.Ev, sample)
		}
		return
	}
	for _, raw := range items {
		m.ingest(raw, channel)
	}
}

func parseFJItems(payload []byte) []fjRawNews {
	payload = bytes.TrimSpace(payload)
	if len(payload) == 0 {
		return nil
	}
	var list []fjRawNews
	if payload[0] == '[' {
		_ = json.Unmarshal(payload, &list)
	} else {
		var one fjRawNews
		if json.Unmarshal(payload, &one) == nil {
			list = append(list, one)
		}
	}
	out := list[:0]
	for _, it := range list {
		if it.NewsID > 0 && strings.TrimSpace(it.Title) != "" {
			out = append(out, it)
		}
	}
	return out
}

func (m *FinancialJuiceMonitor) ingest(raw fjRawNews, channel string) {
	published := parseFJTime(raw.DatePublished)
	item := m.buildItem(raw, published)

	m.mu.Lock()
	if _, ok := m.seen[item.ID]; ok {
		m.mu.Unlock()
		return
	}
	m.seen[item.ID] = struct{}{}
	m.recent = append([]NewsItem{item}, m.recent...)
	m.sortRecentLocked()
	m.buffer = append(m.buffer, item)
	m.realtimeCount++
	m.mu.Unlock()

	m.appendJSONL(item)
	if b, err := json.Marshal(map[string]interface{}{"type": "news_flash", "news": item}); err == nil {
		m.hub.BroadcastNews(b)
	}
	m.macro.OnNews(raw)
	flags := ""
	if item.Breaking {
		flags += " [BREAKING]"
	}
	if item.IsUS {
		flags += " [美国]"
	}
	m.logf("实时捕获 #%d (%s) [%s]%s %s → %s", item.ID, channel, item.Category, flags, item.Title, item.Impact)
}

func (m *FinancialJuiceMonitor) buildItem(raw fjRawNews, published time.Time) NewsItem {
	title := strings.TrimSpace(raw.Title)
	an := analyzeNewsHeadline(title, raw.Breaking)

	tags := []string{}
	for _, l := range append(raw.Labels, raw.Tags...) {
		if s := labelText(l); s != "" {
			tags = appendUnique(tags, s)
		}
	}
	if raw.FCName != "" {
		tags = appendUnique(tags, raw.FCName)
	}
	if an.IsUS {
		tags = appendUnique(tags, "美国")
	}
	if raw.Breaking {
		tags = appendUnique(tags, "BREAKING")
	}

	item := NewsItem{
		ID:         raw.NewsID,
		Title:      title,
		Source:     fjSource,
		Tags:       tags,
		URL:        fjNewsURL(raw.NewsID, title),
		Breaking:   raw.Breaking,
		ReceivedAt: beijingNow().Format(time.RFC3339),
	}
	applyNewsAnalysis(&item, an)
	if strings.TrimSpace(raw.Description) != "" {
		item.Description = strings.TrimSpace(raw.Description)
	}
	if !published.IsZero() {
		item.PublishedAt = published.UTC().Format(time.RFC3339)
		item.Time = published.In(beijingLoc).Format(time.RFC3339)
	} else {
		item.Time = beijingNow().Format(time.RFC3339)
	}
	return item
}

func applyNewsAnalysis(item *NewsItem, an newsAnalysis) {
	item.Summary = an.Summary
	item.Category = an.Category
	item.Impact = an.Impact
	item.ImpactLevel = an.ImpactLevel
	item.IsUS = an.IsUS
	item.Alert = an.IsUS || item.Breaking
	item.Impacts = an.Impacts
	item.Drivers = an.Drivers
	if item.Impacts == nil {
		item.Impacts = []AssetImpact{}
	}
	if item.Drivers == nil {
		item.Drivers = []NewsDriver{}
	}
}

// fjNewsURL 站点只识别 /News/<id>/<slug>.aspx (裸 /News/<id> 会 302 到 404 页)；
// slug 内容不参与路由，按站点规则生成仅为可读性。
func fjNewsURL(id int64, title string) string {
	var b strings.Builder
	for _, r := range title {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-':
			b.WriteRune(r)
		case r == ' ':
			b.WriteByte('-')
		}
	}
	slug := strings.Trim(b.String(), "-")
	if len(slug) > 120 {
		slug = strings.TrimRight(slug[:120], "-")
	}
	if slug == "" {
		slug = "news"
	}
	return fmt.Sprintf("%s/News/%d/%s.aspx", fjOrigin, id, slug)
}

// parseFJTime DatePublished 不带时区，经与 RSS 的 GMT pubDate 比对确认为 UTC
func parseFJTime(s string) time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999999", "2006-01-02T15:04:05"} {
		if t, err := time.ParseInLocation(layout, s, time.UTC); err == nil {
			return t
		}
	}
	return time.Time{}
}

func labelText(raw json.RawMessage) string {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return strings.TrimSpace(s)
	}
	var obj map[string]interface{}
	if json.Unmarshal(raw, &obj) == nil {
		for _, k := range []string{"Name", "Label", "Title", "Text", "name", "label"} {
			if v, ok := obj[k].(string); ok && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
	}
	return ""
}

func (m *FinancialJuiceMonitor) sortRecentLocked() {
	sort.SliceStable(m.recent, func(i, j int) bool { return m.recent[i].ID > m.recent[j].ID })
	if len(m.recent) > fjRecentLimit {
		m.recent = m.recent[:fjRecentLimit]
	}
}

func (m *FinancialJuiceMonitor) appendJSONL(item NewsItem) {
	if m.outFile == nil {
		return
	}
	b, err := json.Marshal(item)
	if err != nil {
		return
	}
	m.outMu.Lock()
	defer m.outMu.Unlock()
	if _, err := m.outFile.Write(append(b, '\n')); err != nil {
		m.logf("写入 JSONL 失败: %v", err)
	}
}

func (m *FinancialJuiceMonitor) setStatus(status, lastErr string) {
	m.mu.Lock()
	changed := m.status != status
	m.status = status
	if lastErr != "" {
		m.lastError = lastErr
	} else if status == "connected" {
		m.lastError = ""
	}
	m.mu.Unlock()
	if !changed {
		return
	}
	if b, err := json.Marshal(map[string]interface{}{"type": "news_status", "status": m.Status()}); err == nil {
		m.hub.BroadcastNews(b)
	}
}

var fjStatusText = map[string]string{
	"connecting":   "正在连接",
	"connected":    "已连接",
	"reconnecting": "断线重连中",
	"disabled":     "已关闭",
}

func (m *FinancialJuiceMonitor) Status() NewsStreamStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	st := NewsStreamStatus{
		Source:        fjSource,
		Status:        m.status,
		StatusText:    fjStatusText[m.status],
		ClientID:      m.clientID,
		Reconnects:    m.reconnects,
		BaselineCount: m.baselineCount,
		RealtimeCount: m.realtimeCount,
		TotalTracked:  len(m.seen),
		Round:         m.round,
		LastError:     m.lastError,
	}
	if !m.connectedAt.IsZero() {
		st.ConnectedSince = m.connectedAt.In(beijingLoc).Format(time.RFC3339)
	}
	if !m.lastMsgAt.IsZero() {
		st.LastMessageAt = m.lastMsgAt.In(beijingLoc).Format(time.RFC3339)
	}
	return st
}

// Recent 返回最新的 limit 条快讯 (最新在前)
func (m *FinancialJuiceMonitor) Recent(limit int) []NewsItem {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit <= 0 || limit > len(m.recent) {
		limit = len(m.recent)
	}
	out := make([]NewsItem, limit)
	copy(out, m.recent[:limit])
	return out
}

// ByIDs 按 ID 选取快讯，保持最新在前的顺序
func (m *FinancialJuiceMonitor) ByIDs(ids []int64) []NewsItem {
	want := make(map[int64]bool, len(ids))
	for _, id := range ids {
		want[id] = true
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []NewsItem
	for _, it := range m.recent {
		if want[it.ID] {
			out = append(out, it)
		}
	}
	return out
}

// reportLoop 周期报告只用于运维日志；前端推送不受该周期影响，快讯到达即推送
func (m *FinancialJuiceMonitor) reportLoop() {
	ticker := time.NewTicker(m.cfg.ReportInterval)
	defer ticker.Stop()
	for range ticker.C {
		m.mu.Lock()
		m.round++
		round := m.round
		batch := m.buffer
		m.buffer = nil
		status := m.status
		clientID := m.clientID
		connectedAt := m.connectedAt
		lastMsgAt := m.lastMsgAt
		reconnects := m.reconnects
		total := len(m.seen)
		baseline := m.baselineCount
		realtime := m.realtimeCount
		lastErr := m.lastError
		m.mu.Unlock()

		now := beijingNow()
		var b strings.Builder
		sep := strings.Repeat("═", 78)
		fmt.Fprintf(&b, "%s\n", sep)
		fmt.Fprintf(&b, "%s [FinancialJuice 周期报告] 第 %04d 轮 | 检查周期 %v\n", now.Format("2006-01-02 15:04:05 (北京时间)"), round, m.cfg.ReportInterval)
		connLine := fjStatusText[status]
		if status == "connected" {
			connLine += fmt.Sprintf(" | client=%s | 已持续 %s", clientID, time.Since(connectedAt).Round(time.Second))
		} else if lastErr != "" {
			connLine += " | 最近错误: " + lastErr
		}
		if !lastMsgAt.IsZero() {
			connLine += fmt.Sprintf(" | 最近一次收到数据: %s 前", time.Since(lastMsgAt).Round(time.Second))
		}
		connLine += fmt.Sprintf(" | 累计重连 %d 次", reconnects)
		fmt.Fprintf(&b, "  连接状态   : %s\n", connLine)
		fmt.Fprintf(&b, "  本次新增   : %d 条\n", len(batch))
		fmt.Fprintf(&b, "  累计已监控 : %d 条 (RSS 基准 %d 条 + 本次运行实时新增 %d 条)\n", total, baseline, realtime)

		if len(batch) == 0 {
			if status == "connected" {
				fmt.Fprintf(&b, "  过去 %d 秒内未监测到新快讯，数据流连接保持活跃\n", int(m.cfg.ReportInterval.Seconds()))
			} else {
				fmt.Fprintf(&b, "  过去 %d 秒内未监测到新快讯，数据流当前%s\n", int(m.cfg.ReportInterval.Seconds()), fjStatusText[status])
			}
		}
		for i, it := range batch {
			fmt.Fprintf(&b, "  ── 新增快讯 %d/%d %s\n", i+1, len(batch), strings.Repeat("─", 50))
			fmt.Fprintf(&b, "    快讯ID   : %d\n", it.ID)
			fmt.Fprintf(&b, "    分类名称 : %s\n", it.Category)
			fmt.Fprintf(&b, "    发布时间 : %s\n", formatReportTime(it))
			fmt.Fprintf(&b, "    突发标记 : %s\n", map[bool]string{true: "是 (BREAKING 突发新闻)", false: "否"}[it.Breaking])
			fmt.Fprintf(&b, "    美国相关 : %s\n", map[bool]string{true: "是 (已推送前端弹窗)", false: "否"}[it.IsUS])
			fmt.Fprintf(&b, "    新闻标题 : %s\n", it.Title)
			fmt.Fprintf(&b, "    原文链接 : %s\n", it.URL)
			fmt.Fprintf(&b, "    资产影响 : %s\n", formatImpactsForLog(it.Impacts))
			if it.Summary != "" && len(it.Impacts) > 0 {
				fmt.Fprintf(&b, "    研判依据 : %s\n", it.Summary)
			}
			for _, d := range it.Drivers {
				fmt.Fprintf(&b, "    传导链   : [%s] %s\n", d.Title, strings.Join(d.Chain, " → "))
			}
		}
		fmt.Fprintf(&b, "%s\n", sep)
		m.logBlock(b.String())
	}
}

func formatReportTime(it NewsItem) string {
	if it.PublishedAt == "" {
		return "未知"
	}
	t, err := time.Parse(time.RFC3339, it.PublishedAt)
	if err != nil {
		return it.PublishedAt
	}
	return fmt.Sprintf("%s (北京时间) / %s UTC", t.In(beijingLoc).Format("2006-01-02 15:04:05"), t.UTC().Format("2006-01-02 15:04:05"))
}
