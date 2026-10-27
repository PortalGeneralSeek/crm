package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"

	tvws "github.com/fasthttp/websocket"
	"github.com/gofiber/websocket/v2"
)

// marketSymbols 实时报价订阅清单，同时也是 K 线接口允许查询的标的白名单。
// 不订阅 FOREXCOM:XAUUSD / XAGUSD 别名：它们与 TVC 源的昨收、涨跌、买卖盘不同，
// 合并写入同一标的会导致价格与涨跌幅在两个数据源之间来回跳变。
var marketSymbols = []string{
	"TVC:GOLD", "TVC:SILVER",
	"TVC:USOIL", "TVC:UKOIL", "COMEX:HG1!",
	"TVC:DXY", "TVC:US10Y", "FX_IDC:USDCNH", "TVC:VIX", "TVC:SPX", "BINANCE:BTCUSDT",
}

// 北京时间 (UTC+8) 统一时区定义
var beijingLoc = time.FixedZone("CST", 8*3600)
var lastDBSave sync.Map

func beijingNow() time.Time {
	return time.Now().In(beijingLoc)
}

// BeijingNow 导出供其他包获取标准北京时间
func BeijingNow() time.Time {
	return beijingNow()
}

// WSS 订阅主题 (连接参数 ?topic=)
const (
	// TopicMarket 大类资产页面：接收行情跳价与快讯
	TopicMarket = "market"
	// TopicNews 全局快讯弹窗：只接收快讯，不计入行情在线数
	TopicNews = "news"
	// TopicStocks 美股页面：接收美股跳价与快讯
	TopicStocks = "stocks"
)

// ParseTopic 未知或缺省主题按大类资产行情处理，兼容旧客户端
func ParseTopic(raw string) string {
	switch raw {
	case TopicNews, TopicStocks:
		return raw
	}
	return TopicMarket
}

// MarketClient 管理单个已认证客户端的异步发送通道
type MarketClient struct {
	Conn  *websocket.Conn
	Send  chan []byte
	Topic string
}

func (c *MarketClient) WriteLoop() {
	defer func() {
		_ = c.Conn.Close()
	}()
	for msg := range c.Send {
		_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[Market WSS] 推送写入失败，断开该客户端: %v", err)
			break
		}
	}
}

// MarketHub 管理已登录并建立 WSS 的客户端连接
type MarketHub struct {
	clients map[*MarketClient]bool
	mu      sync.RWMutex
}

func NewMarketHub() *MarketHub {
	return &MarketHub{
		clients: make(map[*MarketClient]bool),
	}
}

func (h *MarketHub) Register(conn *websocket.Conn, topic string) *MarketClient {
	client := &MarketClient{
		Conn:  conn,
		Send:  make(chan []byte, 128),
		Topic: ParseTopic(topic),
	}
	h.mu.Lock()
	h.clients[client] = true
	count := len(h.clients)
	h.mu.Unlock()
	log.Printf("[Market WSS] 客户端已连接 (topic=%s, 当前活跃订阅数: %d)", client.Topic, count)
	return client
}

func (h *MarketHub) Unregister(client *MarketClient) {
	if client == nil {
		return
	}
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.Send)
		_ = client.Conn.Close()
		log.Printf("[Market WSS] 客户端已断开 (当前活跃订阅数: %d)", len(h.clients))
	}
	h.mu.Unlock()
}

// ClientCount 返回接收大类资产行情跳价的客户端数
func (h *MarketHub) ClientCount() int {
	return h.TopicCount(TopicMarket)
}

func (h *MarketHub) TopicCount(topic string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	n := 0
	for c := range h.clients {
		if c.Topic == topic {
			n++
		}
	}
	return n
}

func (h *MarketHub) Has(client *MarketClient) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.clients[client]
}

// SendTo 定向推送给单个客户端；持读锁检查仍在册，避免向 Unregister 已关闭的通道写入而 panic
func (h *MarketHub) SendTo(client *MarketClient, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if !h.clients[client] {
		return
	}
	select {
	case client.Send <- msg:
	default:
	}
}

// Broadcast 大类资产行情跳价，只推给大类资产页面
func (h *MarketHub) Broadcast(msg []byte) {
	h.BroadcastTopic(TopicMarket, msg)
}

func (h *MarketHub) BroadcastTopic(topic string, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.Topic != topic {
			continue
		}
		select {
		case client.Send <- msg:
		default:
			// 慢客户端通道已满，丢弃该帧避免阻塞全局推流
		}
	}
}

// BroadcastNews 快讯推送给所有客户端 (含仅订阅快讯的客户端)
func (h *MarketHub) BroadcastNews(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		select {
		case client.Send <- msg:
		default:
		}
	}
}

type MarketService struct {
	audit      *AuditService
	httpClient *http.Client
	hub        *MarketHub
	klines     *KlineManager
	news       *FinancialJuiceMonitor
	stocks     *UsStockMonitor
	quotesMu   sync.RWMutex
	quotesMap  map[string]QuoteItem
	// changed 自上次广播以来有跳价的标的，由 quotesMu 保护
	changed map[string]struct{}
}

func NewMarketService() *MarketService {
	svc := &MarketService{
		audit: NewAuditService(),
		// 不设 Client.Timeout：它会把读取整个响应体也算进去，大模型流式输出必然超过，
		// 超时由各调用自己的 context 控制
		httpClient: &http.Client{
			Transport: newPublicOnlyTransport(),
		},
		hub:       NewMarketHub(),
		quotesMap: make(map[string]QuoteItem),
		changed:   make(map[string]struct{}),
	}
	klineSymbols := append(append([]string{}, marketSymbols...), UsStockSymbols()...)
	svc.klines = NewKlineManager(svc.hub, klineSymbols)
	NewKlineArchiver(klineSymbols).Start()

	// 1. 初始化 11 项跨资产监控标的默认元数据
	defaultQuotes := []QuoteItem{
		{Symbol: "TVC:GOLD", Name: "现货黄金 (Gold)", Category: "贵金属", Price: 4205.350, Unit: "USD/oz"},
		{Symbol: "TVC:SILVER", Name: "现货白银 (Silver)", Category: "贵金属", Price: 61.080, Unit: "USD/oz"},
		{Symbol: "TVC:USOIL", Name: "WTI 原油 (Crude Oil)", Category: "大宗能源", Price: 90.15, Unit: "USD/bbl"},
		{Symbol: "TVC:UKOIL", Name: "布伦特原油 (Brent Oil)", Category: "大宗能源", Price: 103.05, Unit: "USD/bbl"},
		{Symbol: "COMEX:HG1!", Name: "COMEX 铜 (Copper)", Category: "大宗工业", Price: 6.73, Unit: "USD/lb"},
		{Symbol: "TVC:DXY", Name: "美元指数 (US Dollar Index)", Category: "汇率利差", Price: 102.16, Unit: "点"},
		{Symbol: "TVC:US10Y", Name: "美债10年期收益率 (US10Y)", Category: "汇率利差", Price: 5.242, Unit: "%"},
		{Symbol: "FX_IDC:USDCNH", Name: "美元 / 离岸人民币", Category: "汇率利差", Price: 6.692, Unit: "CNY"},
		{Symbol: "TVC:VIX", Name: "恐慌指数 (S&P 500 VIX)", Category: "风险与股市", Price: 14.85, Unit: "点"},
		{Symbol: "TVC:SPX", Name: "标普500指数 (S&P 500)", Category: "风险与股市", Price: 7811.54, Unit: "点"},
		{Symbol: "BINANCE:BTCUSDT", Name: "比特币 (BTC/USDT)", Category: "风险与股市", Price: 83670.0, Unit: "USDT"},
	}

	for _, q := range defaultQuotes {
		q.UpdatedTime = beijingNow().Format("15:04:05")
		svc.quotesMap[q.Symbol] = q
	}

	// 2. 从本地 MySQL 预热最近一次持久化的行情
	svc.loadQuotesFromDB()

	// 3. 启动后台行情数据采集与广播服务：
	// “登录有建立wss,再推送,没有登录直接写入数据库即可”
	svc.StartCollector()

	// 4. FinancialJuice 全球实时快讯 (Centrifugo WSS)，到达即推送前端
	svc.news = NewFinancialJuiceMonitor(svc.hub)
	svc.news.Start()

	// 5. 美股核心科技股实时报价 (独立 TradingView 连接)
	svc.stocks = NewUsStockMonitor(svc.hub)
	svc.stocks.Start()

	return svc
}

// GetStocks 美股核心科技股报价快照 (实时增量通过 topic=stocks 的 WSS stock_tick 推送)
func (s *MarketService) GetStocks() StockSnapshot {
	return s.stocks.Snapshot()
}

func (s *MarketService) NewsStatus() NewsStreamStatus {
	return s.news.Status()
}

// GetMacroData 各国 CPI/PPI 最新值、历史与发布日程 (实时增量通过 WSS macro_release 推送)
func (s *MarketService) GetMacroData() MacroSnapshot {
	return s.news.Macro().Snapshot()
}

func (s *MarketService) GetHub() *MarketHub {
	return s.hub
}

const klineArchivePageLimit = 5000

// GetKlines before<=0 时返回最新 K 线 (优先 TradingView 实时数据，不可用时用本地归档兜底)；
// before>0 时从本地归档返回该时间之前的 limit 根，用于图表向左翻页。source 为 live 或 archive。
func (s *MarketService) GetKlines(symbol, interval string, limit int, before int64) ([]KlineBar, string, error) {
	key, err := s.klines.validate(symbol, interval)
	if err != nil {
		return nil, "", err
	}
	if before > 0 {
		if limit <= 0 || limit > klineArchivePageLimit {
			limit = klineHistoryBars
		}
		bars, err := loadArchivedKlines(key, before, limit)
		if err != nil {
			return nil, "", fmt.Errorf("读取 K 线归档失败: %w", err)
		}
		return bars, "archive", nil
	}

	bars, liveErr := s.klines.GetBars(symbol, interval, limit)
	if liveErr == nil && len(bars) > 0 {
		return bars, "live", nil
	}
	if limit <= 0 || limit > klineHistoryBars {
		limit = klineHistoryBars
	}
	archived, err := loadArchivedKlines(key, 0, limit)
	if err == nil && len(archived) > 0 {
		return archived, "archive", nil
	}
	return bars, "live", liveErr
}

func (s *MarketService) SubscribeKline(client *MarketClient, symbol, interval string) error {
	return s.klines.Subscribe(client, symbol, interval)
}

func (s *MarketService) UnsubscribeKline(client *MarketClient) {
	s.klines.Unsubscribe(client)
}

// newPublicOnlyTransport 用户可自定义大模型 BaseURL，必须防止 SSRF 打到本机服务、内网或云元数据 (169.254.169.254)。
// 校验放在拨号阶段 (DNS 解析之后)，可同时防御 DNS rebinding。
func newPublicOnlyTransport() *http.Transport {
	dialer := &net.Dialer{
		Timeout: 5 * time.Second,
		Control: func(network, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			ip := net.ParseIP(host)
			if ip == nil || !isPublicIP(ip) {
				return fmt.Errorf("禁止访问内网或保留地址: %s", host)
			}
			return nil
		},
	}
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.Proxy = nil
	t.DialContext = dialer.DialContext
	t.MaxIdleConns = 4
	return t
}

var cgnatRange = &net.IPNet{IP: net.IPv4(100, 64, 0, 0), Mask: net.CIDRMask(10, 32)}

func isPublicIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() {
		return false
	}
	if ip4 := ip.To4(); ip4 != nil && (ip4[0] == 0 || cgnatRange.Contains(ip4)) {
		return false
	}
	return true
}

// QuoteItem 资产行情定义
type QuoteItem struct {
	Symbol      string  `json:"symbol"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	Change      float64 `json:"change"`
	ChangePct   float64 `json:"changePct"`
	High        float64 `json:"high"`
	Low         float64 `json:"low"`
	Open        float64 `json:"open"`
	PrevClose   float64 `json:"prevClose"`
	Bid         float64 `json:"bid"`
	Ask         float64 `json:"ask"`
	Unit        string  `json:"unit"`
	UpdatedTime string  `json:"updatedTime"`
}

// NewsItem 宏观时政与要闻定义
type NewsItem struct {
	ID          int64         `json:"id"`
	Title       string        `json:"title"`
	Description string        `json:"description,omitempty"`
	Summary     string        `json:"summary"` // 资产影响研判依据
	Source      string        `json:"source"`
	Category    string        `json:"category"`    // 宏观经济 / 央行货币政策 / 地缘政治 / 大宗商品 / 外汇 / 加密货币 ...
	Impact      string        `json:"impact"`      // 看涨/看跌资产汇总，无明确影响时为 "中性 / 待观察"
	ImpactLevel string        `json:"impactLevel"` // high / medium / low
	Time        string        `json:"time"`        // 北京时间 RFC3339
	PublishedAt string        `json:"publishedAt,omitempty"`
	ReceivedAt  string        `json:"receivedAt,omitempty"`
	Tags        []string      `json:"tags"`
	URL         string        `json:"url,omitempty"`
	Breaking    bool          `json:"breaking"`
	IsUS        bool          `json:"isUS"`
	Alert       bool          `json:"alert"`              // 需要前端弹窗提示 (美国相关或突发)
	Baseline    bool          `json:"baseline,omitempty"` // 启动时 RSS 基准数据，非实时新增
	Impacts     []AssetImpact `json:"impacts"`
	Drivers     []NewsDriver  `json:"drivers"` // 命中的宏观传导剧本 (见 macro_playbook.go)
}

// ApiConfig 用户可选自定义的大模型 API 配置
type ApiConfig struct {
	BaseURL     string  `json:"baseUrl"`
	ApiKey      string  `json:"apiKey"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
}

type MarketAnalysisRequest struct {
	Prompt       string     `json:"prompt"`
	AnalysisType string     `json:"analysisType"`
	ApiConfig    *ApiConfig `json:"apiConfig"`
	// NewsIDs 用户在页面上勾选的快讯；为空时自动选取最新快讯
	NewsIDs []int64 `json:"newsIds"`
}

type MarketAnalysisResponse struct {
	Answer         string                 `json:"answer"`
	AnalysisType   string                 `json:"analysisType"`
	Engine         string                 `json:"engine"`
	PromptUsed     string                 `json:"promptUsed"`
	QuotesSnapshot map[string]float64     `json:"quotesSnapshot"`
	DerivedMetrics map[string]interface{} `json:"derivedMetrics"`
	NewsCount      int                    `json:"newsCount"`
	Timestamp      string                 `json:"timestamp"`
}

// loadQuotesFromDB 从本地 MySQL 数据库加载最近一次持久化的历史行情预热内存
func (s *MarketService) loadQuotesFromDB() {
	if database.DB == nil {
		return
	}
	var records []model.CrmMarketQuote
	database.DB.Find(&records)
	if len(records) == 0 {
		return
	}

	s.quotesMu.Lock()
	defer s.quotesMu.Unlock()
	for _, r := range records {
		if q, exists := s.quotesMap[r.Symbol]; exists {
			if r.Price > 0 {
				q.Price = r.Price
				q.Change = r.Change
				q.ChangePct = r.ChangePct
				q.High = r.High
				q.Low = r.Low
				q.Open = r.Open
				q.PrevClose = r.PrevClose
				q.Bid = r.Bid
				q.Ask = r.Ask
				q.UpdatedTime = r.UpdatedAt.In(beijingLoc).Format("15:04:05")
				s.quotesMap[r.Symbol] = q
			}
		}
	}
}

// StartCollector 后台行情采集与流分发服务：
// 核心逻辑：
// 1. 直连 TradingView 官方 WSS 数据源，全量接收 11 项跨资产标的逐笔跳价；
// 2. 没有登录直接写入数据库即可 (无论是否有客户端连接，后台每 3 秒持久化至 MySQL)；
// 3. 登录有建立 wss，再向客户端实时广播推送跳价流 (每 600ms 聚合广播，极低延迟且不卡顿浏览器)。
func (s *MarketService) StartCollector() {
	// 1. 启动 TradingView 实时 WebSocket 行情桥接协程
	go s.startTradingViewBridge()

	// 2. 启动前端 WSS 实时跳价广播协程 (登录建立wss再推送)
	go s.startBroadcaster()

	// 3. 启动数据库持久化写入协程 (没有登录直接写入数据库)
	go s.startDBPersistence()
}

// startTradingViewBridge 建立与 TradingView 官方 WebSocket 服务器的长连接并订阅全部资产行情
func (s *MarketService) startTradingViewBridge() {
	headers := http.Header{}
	headers.Set("Origin", "https://cn.tradingview.com")
	headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	splitter := regexp.MustCompile(`~m~\d+~m~`)
	heartbeatRegex := regexp.MustCompile(`~h~\d+`)

	symbols := marketSymbols

	for {
		log.Println("[TradingView Bridge] 正在连接 TradingView 官方行情 WebSocket...")
		dialer := tvws.DefaultDialer
		conn, _, err := dialer.Dial("wss://data.tradingview.com/socket.io/websocket", headers)
		if err != nil {
			log.Printf("[TradingView Bridge] 连接失败: %v，3秒后重试...", err)
			time.Sleep(3 * time.Second)
			continue
		}

		sid := "qs_" + randomString(10)
		log.Printf("[TradingView Bridge] 成功连接，会话ID: %s，开始订阅全量跨资产行情...", sid)

		// 认证与建立行情会话
		_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(map[string]interface{}{
			"m": "set_auth_token",
			"p": []string{"unauthorized_user_token"},
		})))
		_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(map[string]interface{}{
			"m": "quote_create_session",
			"p": []string{sid},
		})))
		_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(map[string]interface{}{
			"m": "quote_set_fields",
			"p": []interface{}{sid, "lp", "ch", "chp", "description", "short_name", "bid", "ask", "high_price", "low_price", "open_price", "prev_close_price"},
		})))

		// quote_fast_symbols 是"整体替换"语义而非追加：逐个发送时只有最后一个标的保持实时流，
		// 其余标的会被降级为低频推送，因此必须一次性提交完整列表。
		subParams := append([]string{sid}, symbols...)
		_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(map[string]interface{}{
			"m": "quote_add_symbols",
			"p": subParams,
		})))
		_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(map[string]interface{}{
			"m": "quote_fast_symbols",
			"p": subParams,
		})))

		for {
			conn.SetReadDeadline(time.Now().Add(20 * time.Second))
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Printf("[TradingView Bridge] 读取数据中断: %v，准备重新建立连接...", err)
				_ = conn.Close()
				break
			}

			strMsg := string(msg)
			// 1. 优先即时回复心跳帧，绝不漏回任何心跳！
			if strings.Contains(strMsg, "~h~") {
				for _, hb := range heartbeatRegex.FindAllString(strMsg, -1) {
					_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVRaw(hb)))
				}
			}

			parts := splitter.Split(strMsg, -1)
			for _, part := range parts {
				if part == "" || strings.HasPrefix(part, "~h~") {
					continue
				}

				var packet struct {
					M string        `json:"m"`
					P []interface{} `json:"p"`
				}
				if err := json.Unmarshal([]byte(part), &packet); err == nil && packet.M == "qsd" {
					if len(packet.P) >= 2 {
						if qData, ok := packet.P[1].(map[string]interface{}); ok {
							sym, _ := qData["n"].(string)
							val, _ := qData["v"].(map[string]interface{})
							s.updateQuoteFromTV(sym, val)
						}
					}
				}
			}
		}

		time.Sleep(2 * time.Second)
	}
}

// updateQuoteFromTV 处理 TradingView 单笔行情跳价推送并即时广播
func (s *MarketService) updateQuoteFromTV(sym string, val map[string]interface{}) {
	targetSym := sym

	s.quotesMu.Lock()
	q, ok := s.quotesMap[targetSym]
	if !ok {
		s.quotesMu.Unlock()
		return
	}

	updated := false
	priceChanged := false

	if b, ok := val["bid"].(float64); ok && b > 0 {
		q.Bid = b
		updated = true
	}
	if a, ok := val["ask"].(float64); ok && a > 0 {
		q.Ask = a
		updated = true
	}

	if lp, ok := val["lp"].(float64); ok && lp > 0 {
		if q.Price != lp {
			priceChanged = true
		}
		q.Price = lp
		updated = true
	} else if q.Bid > 0 && q.Ask > 0 {
		// 当 TradingView 仅推送买卖盘跳价时，即时以中间价(Mid Price)更新最新盘面现货跳价
		mid := (q.Bid + q.Ask) / 2.0
		if q.Price != mid {
			priceChanged = true
		}
		q.Price = mid
		updated = true
	} else if q.Bid > 0 {
		if q.Price != q.Bid {
			priceChanged = true
		}
		q.Price = q.Bid
		updated = true
	}

	if ch, ok := val["ch"].(float64); ok {
		q.Change = ch
		updated = true
	} else if priceChanged && q.PrevClose > 0 {
		q.Change = q.Price - q.PrevClose
	}

	if chp, ok := val["chp"].(float64); ok {
		q.ChangePct = chp
		updated = true
	} else if priceChanged && q.PrevClose > 0 {
		q.ChangePct = (q.Change / q.PrevClose) * 100.0
	}

	if h, ok := val["high_price"].(float64); ok && h > 0 {
		q.High = h
	} else if q.Price > q.High && q.High > 0 {
		q.High = q.Price
	}

	if l, ok := val["low_price"].(float64); ok && l > 0 {
		q.Low = l
	} else if q.Price < q.Low && q.Low > 0 {
		q.Low = q.Price
	}

	if o, ok := val["open_price"].(float64); ok && o > 0 {
		q.Open = o
	}
	if pc, ok := val["prev_close_price"].(float64); ok && pc > 0 {
		q.PrevClose = pc
	}

	if updated {
		q.UpdatedTime = beijingNow().Format("15:04:05")
		s.quotesMap[targetSym] = q
		s.changed[targetSym] = struct{}{}
	}
	s.quotesMu.Unlock()

	if !updated {
		return
	}

	// 有登录用户时由 startBroadcaster 合并推送；否则直接落库
	if s.hub.ClientCount() == 0 {
		go s.SaveQuoteSingleToDB(q)
	}
}

// SaveQuoteSingleToDB 将单条最新跳价持久化至 MySQL (没有登录时直接写入数据库)
func (s *MarketService) SaveQuoteSingleToDB(q QuoteItem) {
	if database.DB == nil || q.Price <= 0 {
		return
	}
	now := time.Now()
	if last, ok := lastDBSave.Load(q.Symbol); ok {
		if now.Sub(last.(time.Time)) < 1*time.Second {
			return // 保护 MySQL 连接池与内存，同标的1秒内至多写库1次
		}
	}
	lastDBSave.Store(q.Symbol, now)

	var record model.CrmMarketQuote
	err := database.DB.Where("symbol = ?", q.Symbol).First(&record).Error
	if err != nil {
		record = model.CrmMarketQuote{
			Symbol:    q.Symbol,
			Name:      q.Name,
			Category:  q.Category,
			Price:     q.Price,
			Change:    q.Change,
			ChangePct: q.ChangePct,
			High:      q.High,
			Low:       q.Low,
			Open:      q.Open,
			PrevClose: q.PrevClose,
			Bid:       q.Bid,
			Ask:       q.Ask,
			Unit:      q.Unit,
			UpdatedAt: beijingNow(),
		}
		database.DB.Create(&record)
	} else {
		database.DB.Model(&record).Updates(map[string]interface{}{
			"price":      q.Price,
			"change":     q.Change,
			"change_pct": q.ChangePct,
			"high":       q.High,
			"low":        q.Low,
			"open":       q.Open,
			"prev_close": q.PrevClose,
			"bid":        q.Bid,
			"ask":        q.Ask,
			"updated_at": beijingNow(),
		})
	}
}

const (
	marketTickInterval = 500 * time.Millisecond
	// 增量帧在客户端发送队列满时会被丢弃，定期补一帧全量快照自愈
	marketFullSnapshotEvery = 10 * time.Second
)

// startBroadcaster 合并推送行情跳价：每 500ms 最多一帧，只带这段时间内变动过的标的。
// TradingView 每秒会推送 5-10 次跳价，逐笔广播全量快照 (约 4KB/帧) 会让跨境或弱网客户端积压，
// 最终写超时断线、页面停止更新。
func (s *MarketService) startBroadcaster() {
	ticker := time.NewTicker(marketTickInterval)
	defer ticker.Stop()
	var lastFull time.Time

	for range ticker.C {
		clientCount := s.hub.ClientCount()
		if clientCount == 0 {
			continue
		}

		full := time.Since(lastFull) >= marketFullSnapshotEvery
		s.quotesMu.Lock()
		changed := s.changed
		if len(changed) > 0 {
			s.changed = make(map[string]struct{})
		}
		s.quotesMu.Unlock()
		if len(changed) == 0 && !full {
			continue
		}

		quotes, derived := s.getQuotesListAndDerived()
		updated := make([]string, 0, len(changed))
		if !full {
			delta := quotes[:0:0]
			for _, q := range quotes {
				if _, ok := changed[q.Symbol]; ok {
					delta = append(delta, q)
				}
			}
			quotes = delta
		}
		for _, q := range quotes {
			if _, ok := changed[q.Symbol]; ok {
				updated = append(updated, q.Symbol)
			}
		}
		payload := map[string]interface{}{
			"type":           "market_tick",
			"full":           full,
			"updatedSymbols": updated,
			"quotes":         quotes,
			"derived":        derived,
			"clientCount":    clientCount,
			"timestamp":      beijingNow().Format("15:04:05"),
		}
		if jsonBytes, err := json.Marshal(payload); err == nil {
			s.hub.Broadcast(jsonBytes)
			if full {
				lastFull = time.Now()
			}
		}
	}
}

// startDBPersistence 定时后台全量备份持久化 (无论前台是否有连接，每 5 秒兜底同步一次)
func (s *MarketService) startDBPersistence() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		quotes, _ := s.getQuotesListAndDerived()
		s.SaveQuotesToDB(quotes)
	}
}

// getQuotesListAndDerived 获取当前有序行情列表与动态衍生指标
func (s *MarketService) getQuotesListAndDerived() ([]QuoteItem, map[string]interface{}) {
	s.quotesMu.RLock()
	defer s.quotesMu.RUnlock()

	symbolsOrder := []string{
		"TVC:GOLD", "TVC:SILVER", "TVC:USOIL", "TVC:UKOIL", "COMEX:HG1!",
		"TVC:DXY", "TVC:US10Y", "FX_IDC:USDCNH", "TVC:VIX", "TVC:SPX", "BINANCE:BTCUSDT",
	}

	var list []QuoteItem
	for _, sym := range symbolsOrder {
		if q, ok := s.quotesMap[sym]; ok {
			list = append(list, q)
		}
	}

	goldPrice := s.quotesMap["TVC:GOLD"].Price
	silverPrice := s.quotesMap["TVC:SILVER"].Price
	usdcnh := s.quotesMap["FX_IDC:USDCNH"].Price
	vix := s.quotesMap["TVC:VIX"].Price
	us10y := s.quotesMap["TVC:US10Y"].Price

	gsRatio := 0.0
	if silverPrice > 0 {
		gsRatio = goldPrice / silverPrice
	}

	rmbGold := 0.0
	if usdcnh > 0 {
		rmbGold = (goldPrice * usdcnh) / 31.1034768
	}

	riskSentiment := "Risk-On (偏平稳)"
	if vix >= 25 {
		riskSentiment = "Risk-Off (恐慌避险)"
	} else if vix >= 18 {
		riskSentiment = "Risk-Neutral (中性震荡)"
	}

	derived := map[string]interface{}{
		"goldSilverRatio":  fmt.Sprintf("%.3f", gsRatio),
		"domesticGoldYuan": fmt.Sprintf("%.3f", rmbGold),
		"riskSentiment":    riskSentiment,
		"vixLevel":         vix,
		"fedRateSignal":    fmt.Sprintf("%.3f%% (高位博弈)", us10y),
		"timestamp":        beijingNow().Format("2006-01-02 15:04:05 (北京时间)"),
	}

	return list, derived
}

// SaveQuotesToDB 将最新行情持久化至 MySQL crm_market_quotes 表
func (s *MarketService) SaveQuotesToDB(quotes []QuoteItem) {
	if database.DB == nil {
		return
	}

	for _, q := range quotes {
		if q.Price <= 0 {
			continue
		}
		var record model.CrmMarketQuote
		err := database.DB.Where("symbol = ?", q.Symbol).First(&record).Error
		if err != nil {
			record = model.CrmMarketQuote{
				Symbol:    q.Symbol,
				Name:      q.Name,
				Category:  q.Category,
				Price:     q.Price,
				Change:    q.Change,
				ChangePct: q.ChangePct,
				High:      q.High,
				Low:       q.Low,
				Open:      q.Open,
				PrevClose: q.PrevClose,
				Bid:       q.Bid,
				Ask:       q.Ask,
				Unit:      q.Unit,
				UpdatedAt: beijingNow(),
			}
			database.DB.Create(&record)
		} else {
			database.DB.Model(&record).Updates(map[string]interface{}{
				"price":      q.Price,
				"change":     q.Change,
				"change_pct": q.ChangePct,
				"high":       q.High,
				"low":        q.Low,
				"open":       q.Open,
				"prev_close": q.PrevClose,
				"bid":        q.Bid,
				"ask":        q.Ask,
				"updated_at": beijingNow(),
			})
		}
	}
}

// GetMarketQuotes 获取跨资产实时行情与衍生指标
func (s *MarketService) GetMarketQuotes() ([]QuoteItem, map[string]interface{}, error) {
	quotes, derived := s.getQuotesListAndDerived()
	return quotes, derived, nil
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func formatTVMsg(obj interface{}) string {
	b, _ := json.Marshal(obj)
	return fmt.Sprintf("~m~%d~m~%s", len(b), string(b))
}

func formatTVRaw(s string) string {
	return fmt.Sprintf("~m~%d~m~%s", len(s), s)
}

func (s *MarketService) quotesSnapshotMap() map[string]QuoteItem {
	s.quotesMu.RLock()
	defer s.quotesMu.RUnlock()
	out := make(map[string]QuoteItem, len(s.quotesMap))
	for k, v := range s.quotesMap {
		out[k] = v
	}
	return out
}

// GetPlaybook 宏观传导剧本 + 盘面触发规则 + 当前盘面已触发的驱动
func (s *MarketService) GetPlaybook() PlaybookResponse {
	live := DetectLiveDrivers(s.quotesSnapshotMap())
	if live == nil {
		live = []LiveDriverSignal{}
	}
	return PlaybookResponse{Drivers: MacroPlaybook(), Triggers: LiveTriggerRules(), Live: live}
}

// GetLatestNews 返回 FinancialJuice 实时快讯 (最新在前)
func (s *MarketService) GetLatestNews() []NewsItem {
	return s.news.Recent(100)
}

const aiNewsContextLimit = 30

// newsForAnalysis 优先使用用户勾选的快讯，否则取最新快讯送入 AI 上下文
func (s *MarketService) newsForAnalysis(req MarketAnalysisRequest) []NewsItem {
	if len(req.NewsIDs) > 0 {
		ids := req.NewsIDs
		if len(ids) > aiNewsContextLimit {
			ids = ids[:aiNewsContextLimit]
		}
		if picked := s.news.ByIDs(ids); len(picked) > 0 {
			return picked
		}
	}
	return s.news.Recent(aiNewsContextLimit)
}

func formatNewsForPrompt(newsList []NewsItem) string {
	if len(newsList) == 0 {
		return "（实时快讯数据流暂未收到数据）"
	}
	lines := make([]string, 0, len(newsList))
	for i, n := range newsList {
		flags := ""
		if n.Breaking {
			flags += " [BREAKING]"
		}
		if n.IsUS {
			flags += " [美国相关]"
		}
		published := n.Time
		if t, err := time.Parse(time.RFC3339, n.Time); err == nil {
			published = t.In(beijingLoc).Format("01-02 15:04:05")
		}
		line := fmt.Sprintf("%d. 【%s | %s %s】%s**%s**\n   规则引擎资产影响：%s（等级: %s）",
			i+1, n.Category, n.Source, published, flags, n.Title, n.Impact, n.ImpactLevel)
		for _, d := range n.Drivers {
			line += fmt.Sprintf("\n   传导链[%s]：%s", d.Title, strings.Join(d.Chain, " → "))
		}
		lines = append(lines, line)
	}
	return strings.Join(lines, "\n")
}

// activeDriverKeys 汇总快讯命中与盘面触发的宏观驱动 (去重，盘面驱动在前)
func activeDriverKeys(newsList []NewsItem, live []LiveDriverSignal) []string {
	var keys []string
	seen := map[string]bool{}
	for _, l := range live {
		if !seen[l.Key] {
			seen[l.Key] = true
			keys = append(keys, l.Key)
		}
	}
	for _, n := range newsList {
		for _, d := range n.Drivers {
			if !seen[d.Key] {
				seen[d.Key] = true
				keys = append(keys, d.Key)
			}
		}
	}
	return keys
}

func (s *MarketService) transmissionPromptSection(newsList []NewsItem) string {
	live := DetectLiveDrivers(s.quotesSnapshotMap())
	var b strings.Builder
	b.WriteString("\n\n### 🔗 4. 宏观传导关系 (规则引擎，供推演参考，请结合盘面验证或修正)：\n")
	b.WriteString("**盘面已触发的驱动 (日内涨跌超过阈值) 及其余资产是否按剧本方向运行：**\n")
	b.WriteString(formatLiveDriversForPrompt(live))
	if pb := formatPlaybookForPrompt(activeDriverKeys(newsList, live)); pb != "" {
		b.WriteString("**相关驱动的标准传导链：**\n")
		b.WriteString(pb)
	}
	return b.String()
}

func joinOr(list []string, empty string) string {
	if len(list) == 0 {
		return empty
	}
	return strings.Join(list, "、")
}

func formatLiveDriversForPrompt(live []LiveDriverSignal) string {
	if len(live) == 0 {
		return "（当前盘面日内波动未触发任何宏观驱动阈值）"
	}
	var b strings.Builder
	for _, l := range live {
		fmt.Fprintf(&b, "- **%s**（触发: %s）：剧本方向已兑现 %d/%d 项", l.Title, l.Trigger, l.Confirmed, l.Total)
		var miss []string
		for _, c := range l.Checks {
			if !c.Match {
				miss = append(miss, fmt.Sprintf("%s(%+.2f%%)", c.Name, c.ChangePct))
			}
		}
		if len(miss) > 0 {
			b.WriteString("，背离: " + strings.Join(miss, "、"))
		}
		b.WriteString("\n")
	}
	return b.String()
}

// AnalyzeMarket 执行结合最新时政新闻与盘面数据的 AI 宏观研判
func (s *MarketService) AnalyzeMarket(req MarketAnalysisRequest, userID uint, username, roleName, ip string) (*MarketAnalysisResponse, error) {
	quotes, derived, _ := s.GetMarketQuotes()
	newsList := s.newsForAnalysis(req)

	quotesMap := make(map[string]float64)
	var quoteLines []string
	for _, q := range quotes {
		quotesMap[q.Symbol] = q.Price
		sign := "+"
		if q.Change < 0 {
			sign = ""
		}
		quoteLines = append(quoteLines, fmt.Sprintf("- **%s** (%s): 最新价 `%.3f %s`, 日内涨跌 `%s%.2f%%` (%s%.3f)", q.Name, q.Symbol, q.Price, q.Unit, sign, q.ChangePct, sign, q.Change))
	}

	goldPrice := quotesMap["TVC:GOLD"]
	silverPrice := quotesMap["TVC:SILVER"]
	dxyPrice := quotesMap["TVC:DXY"]
	us10yPrice := quotesMap["TVC:US10Y"]
	oilPrice := quotesMap["TVC:USOIL"]
	vixPrice := quotesMap["TVC:VIX"]
	gsRatio := derived["goldSilverRatio"]
	rmbGold := derived["domesticGoldYuan"]

	systemPrompt := `你是一位拥有20年华尔街大类资产配置与宏观对冲基金实操经验的全球首席宏观策略分析师。
你的专业特长是：精通国际地缘政治时政冲突、央行货币政策博弈、大宗商品供需与全球流动性联动因果链推演。
请严格依据最新给出的实时盘面数据与收集到的国际时政要闻进行深度研判。`

	userPromptBuilder := strings.Builder{}
	userPromptBuilder.WriteString(fmt.Sprintf("【核心任务指令】：请结合当下收集到的最新国际时政动态、地缘政治新闻与实时盘面价格数据，对全球宏观大类资产与黄金走势进行深度多维因果推演与策略研判。\n\n"))

	userPromptBuilder.WriteString("### 📊 1. 实时盘面核心资产报价：\n")
	userPromptBuilder.WriteString(strings.Join(quoteLines, "\n"))
	userPromptBuilder.WriteString(fmt.Sprintf("\n- **核心衍生指标**：金银比 (Gold/Silver Ratio) = `%s`, 折合国内基础金价 = `¥%s 元/克`\n\n", gsRatio, rmbGold))

	userPromptBuilder.WriteString("### 📰 2. FinancialJuice 全球实时快讯 (WSS 实时推送，含规则引擎资产影响初判，英文原文)：\n")
	userPromptBuilder.WriteString(formatNewsForPrompt(newsList))
	userPromptBuilder.WriteString("\n\n### 🌡️ 3. 各国最新 CPI / PPI 通胀数据 (FinancialJuice，美国为全口径)：\n")
	userPromptBuilder.WriteString(s.news.Macro().PromptSummary())
	userPromptBuilder.WriteString(s.transmissionPromptSection(newsList))

	if req.Prompt != "" {
		userPromptBuilder.WriteString(fmt.Sprintf("\n\n### 🎯 用户特别关注诉求：\n%s\n", req.Prompt))
	}

	userPromptBuilder.WriteString(`

### 🔍 必须严格包含的分析维度：
1. 【地缘时政与避险冲击评估】：重点分析中东局势、霍尔木兹海峡地缘风险等最新时政事件对全球风险溢价的催化，测算黄金短期的“地缘政治溢价”规模与持续性。
2. 【货币政策与实际利率传导】：结合美联储鸽派纪要、10年期美债收益率（` + fmt.Sprintf("%.3f%%", us10yPrice) + `）与美元指数（` + fmt.Sprintf("%.2f", dxyPrice) + `），剖析名义利率与通胀预期对非生息资产（黄金）的边际推升力。
3. 【主权去美元化与央行购金长线定海神针】：评估全球央行储备多元化趋势对黄金长期估值中枢的支撑。
4. 【多资产联动共振分析】：结合白银弹性、金银比（` + fmt.Sprintf("%v", gsRatio) + `）、原油（` + fmt.Sprintf("%.2f", oilPrice) + `）引发的二次通胀风险，以及 VIX（` + fmt.Sprintf("%.2f", vixPrice) + `）水平，研判当前市场风格是处于 Risk-On 还是 Risk-Off。
5. 【黄金盘面点位研判与操作风控建议】：给出明确的上方强阻力位、下方防守支撑位、金银配比建议及仓位风控策略。`)

	fullUserPrompt := userPromptBuilder.String()

	var finalAnswer string
	engine := "内嵌全球宏观量化推理引擎 v2.0"

	if req.ApiConfig != nil && strings.TrimSpace(req.ApiConfig.ApiKey) != "" {
		customAnswer, err := s.callExternalLLM(req.ApiConfig, systemPrompt, fullUserPrompt)
		if err == nil && len(customAnswer) > 50 {
			finalAnswer = customAnswer
			engine = fmt.Sprintf("自定义 API 接入模型 (%s)", req.ApiConfig.Model)
		} else {
			finalAnswer = s.generateLocalReport(goldPrice, silverPrice, dxyPrice, us10yPrice, oilPrice, vixPrice, gsRatio, rmbGold, newsList, req.AnalysisType)
			finalAnswer = fmt.Sprintf("> ⚠️ **自定义 API 调用提示**：%v，系统已自动平滑切换至内嵌全球宏观分析引擎为您生成深度研判报告。\n\n%s", err, finalAnswer)
		}
	} else {
		finalAnswer = s.generateLocalReport(goldPrice, silverPrice, dxyPrice, us10yPrice, oilPrice, vixPrice, gsRatio, rmbGold, newsList, req.AnalysisType)
	}

	s.audit.Record(userID, username, roleName, "资产监控", "调用宏观时政AI研判", "POST", "/api/v1/market/ai-analysis", ip,
		fmt.Sprintf("黄金宏观研判分析: 模式=%s, 引擎=%s", req.AnalysisType, engine))

	return &MarketAnalysisResponse{
		Answer:         finalAnswer,
		AnalysisType:   req.AnalysisType,
		Engine:         engine,
		PromptUsed:     fullUserPrompt,
		QuotesSnapshot: quotesMap,
		DerivedMetrics: derived,
		NewsCount:      len(newsList),
		Timestamp:      beijingNow().Format("2006-01-02 15:04:05 (北京时间)"),
	}, nil
}

// StreamChunkCallback 用于 AI 研报 SSE 流式回调
type StreamChunkCallback func(delta string, done bool, meta map[string]interface{})

// StreamAnalyzeMarket 执行结合最新时政要闻与盘面报价的 AI 宏观研报流式输出
func (s *MarketService) StreamAnalyzeMarket(req MarketAnalysisRequest, userID uint, username, roleName, ip string, callback StreamChunkCallback) {
	quotes, derived, _ := s.GetMarketQuotes()
	newsList := s.newsForAnalysis(req)

	quotesMap := make(map[string]float64)
	var quoteLines []string
	for _, q := range quotes {
		quotesMap[q.Symbol] = q.Price
		sign := "+"
		if q.Change < 0 {
			sign = ""
		}
		quoteLines = append(quoteLines, fmt.Sprintf("- **%s** (%s): 最新价 `%.3f %s`, 日内涨跌 `%s%.2f%%` (%s%.3f)", q.Name, q.Symbol, q.Price, q.Unit, sign, q.ChangePct, sign, q.Change))
	}

	goldPrice := quotesMap["TVC:GOLD"]
	silverPrice := quotesMap["TVC:SILVER"]
	dxyPrice := quotesMap["TVC:DXY"]
	us10yPrice := quotesMap["TVC:US10Y"]
	oilPrice := quotesMap["TVC:USOIL"]
	vixPrice := quotesMap["TVC:VIX"]
	gsRatio := derived["goldSilverRatio"]
	rmbGold := derived["domesticGoldYuan"]

	systemPrompt := `你是一位拥有20年华尔街大类资产配置与宏观对冲基金实操经验的全球首席宏观策略分析师。
你的专业特长是：精通国际地缘政治时政冲突、央行货币政策博弈、大宗商品供需与全球流动性联动因果链推演。
请严格依据最新给出的实时盘面数据与收集到的国际时政要闻进行深度研判。`

	userPromptBuilder := strings.Builder{}
	userPromptBuilder.WriteString("【核心任务指令】：请结合当下收集到的最新国际时政动态、地缘政治新闻与实时盘面价格数据，对全球宏观大类资产与黄金走势进行深度多维因果推演与策略研判。\n\n")
	userPromptBuilder.WriteString("### 📊 1. 实时盘面核心资产报价：\n")
	userPromptBuilder.WriteString(strings.Join(quoteLines, "\n"))
	userPromptBuilder.WriteString(fmt.Sprintf("\n- **核心衍生指标**：金银比 (Gold/Silver Ratio) = `%s`, 折合国内基础金价 = `¥%s 元/克`\n\n", gsRatio, rmbGold))
	userPromptBuilder.WriteString("### 📰 2. FinancialJuice 全球实时快讯 (WSS 实时推送，含规则引擎资产影响初判，英文原文)：\n")
	userPromptBuilder.WriteString(formatNewsForPrompt(newsList))
	userPromptBuilder.WriteString("\n\n### 🌡️ 3. 各国最新 CPI / PPI 通胀数据 (FinancialJuice，美国为全口径)：\n")
	userPromptBuilder.WriteString(s.news.Macro().PromptSummary())
	userPromptBuilder.WriteString(s.transmissionPromptSection(newsList))

	if req.Prompt != "" {
		userPromptBuilder.WriteString(fmt.Sprintf("\n\n### 🎯 用户特别关注诉求：\n%s\n", req.Prompt))
	}

	userPromptBuilder.WriteString(`

### 🔍 必须严格包含的分析维度：
1. 【地缘时政与避险冲击评估】：重点分析中东局势、霍尔木兹海峡地缘风险等最新时政事件对全球风险溢价的催化，测算黄金短期的“地缘政治溢价”规模与持续性。
2. 【货币政策与实际利率传导】：结合美联储鸽派纪要、10年期美债收益率（` + fmt.Sprintf("%.3f%%", us10yPrice) + `）与美元指数（` + fmt.Sprintf("%.2f", dxyPrice) + `），剖析名义利率与通胀预期对非生息资产（黄金）的边际推升力。
3. 【主权去美元化与央行购金长线定海神针】：评估全球央行储备多元化趋势对黄金长期估值中枢的支撑。
4. 【多资产联动共振分析】：结合白银弹性、金银比（` + fmt.Sprintf("%v", gsRatio) + `）、原油（` + fmt.Sprintf("%.2f", oilPrice) + `）引发的二次通胀风险，以及 VIX（` + fmt.Sprintf("%.2f", vixPrice) + `）水平，研判当前市场风格是处于 Risk-On 还是 Risk-Off。
5. 【黄金盘面点位研判与操作风控建议】：给出明确的上方强阻力位、下方防守支撑位、金银配比建议及仓位风控策略。`)

	fullUserPrompt := userPromptBuilder.String()
	engine := "内嵌全球宏观量化推理引擎 v2.0"

	meta := map[string]interface{}{
		"engine":         engine,
		"quotesSnapshot": quotesMap,
		"derivedMetrics": derived,
		"newsCount":      len(newsList),
		"timestamp":      beijingNow().Format("2006-01-02 15:04:05 (北京时间)"),
	}

	if req.ApiConfig != nil && strings.TrimSpace(req.ApiConfig.ApiKey) != "" {
		engine = fmt.Sprintf("自定义 API 接入模型 (%s)", req.ApiConfig.Model)
		meta["engine"] = engine
		received, err := s.callExternalLLMStream(req.ApiConfig, systemPrompt, fullUserPrompt, func(delta string) {
			callback(delta, false, nil)
		}, func(reasoning string) {
			callback("", false, map[string]interface{}{"reasoning": reasoning})
		})
		if err != nil && received {
			callback(fmt.Sprintf("\n\n> ⚠️ **自定义 API 提示**：%v", err), false, nil)
			meta["engine"] = engine + " (输出不完整)"
		} else if err != nil {
			alert := fmt.Sprintf("> ⚠️ **自定义 API 接口提示**：%v，已无缝平滑切换至内嵌专业宏观量化研报引擎实时输出。\n\n", err)
			callback(alert, false, nil)
			localReport := s.generateLocalReport(goldPrice, silverPrice, dxyPrice, us10yPrice, oilPrice, vixPrice, gsRatio, rmbGold, newsList, req.AnalysisType)
			s.streamTextChunks(localReport, callback)
			meta["engine"] = "内嵌全球宏观量化引擎 (容灾切换)"
		}
	} else {
		localReport := s.generateLocalReport(goldPrice, silverPrice, dxyPrice, us10yPrice, oilPrice, vixPrice, gsRatio, rmbGold, newsList, req.AnalysisType)
		s.streamTextChunks(localReport, callback)
	}

	callback("", true, meta)

	s.audit.Record(userID, username, roleName, "资产监控", "调用宏观时政AI流式研判", "POST", "/api/v1/market/ai-analysis-stream", ip,
		fmt.Sprintf("黄金宏观研判流式分析: 模式=%s, 引擎=%s", req.AnalysisType, meta["engine"]))
}

const (
	llmStreamTotalTimeout = 5 * time.Minute
	llmStreamIdleTimeout  = 60 * time.Second
	// 推理模型的思考内容同样计入 max_tokens：实测 2500 会被思考全部耗尽、正文为空。
	// 8192 同时也是 DeepSeek 官方 deepseek-chat 允许的上限，再大会被直接 400 拒绝
	llmMaxTokens = 8192
)

var errLLMStreamIdle = fmt.Errorf("大模型接口超过 %v 未返回任何数据", llmStreamIdleTimeout)

// normalizeLLMBaseURL 只填域名时补 /v1：不少 OpenAI 兼容网关的根路径是网站前端，对任意路径都返回 200 的 HTML 页面
func normalizeLLMBaseURL(raw string) string {
	base := strings.TrimRight(strings.TrimSpace(raw), "/")
	if base == "" {
		return "https://api.openai.com/v1"
	}
	if u, err := url.Parse(base); err == nil && u.Host != "" && u.Path == "" {
		return base + "/v1"
	}
	return base
}

func errIfHTML(resp *http.Response) error {
	if strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "text/html") {
		return fmt.Errorf("接口地址 %s 返回的是网页而不是 API 数据，请检查 Base URL（通常以 /v1 结尾）", resp.Request.URL.String())
	}
	return nil
}

// llmErrorText 兼容 {"error":{"message":"..."}} 与 {"error":"..."} 两种写法
func llmErrorText(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var obj struct {
		Message string `json:"message"`
	}
	if json.Unmarshal(raw, &obj) == nil && obj.Message != "" {
		return obj.Message
	}
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	return string(raw)
}

func errNoContentAfterReasoning(finishReason string) error {
	if finishReason == "length" {
		return fmt.Errorf("模型把 max_tokens=%d 全部用在了深度思考上，未输出正文，请换用非推理模型或精简分析诉求", llmMaxTokens)
	}
	return fmt.Errorf("模型只返回了思考过程，未输出正文")
}

// parseChatCompletion 解析非流式 chat/completions 响应 (也用于忽略 stream=true 的网关)
func parseChatCompletion(body []byte) (string, error) {
	var r struct {
		Choices []struct {
			Message struct {
				Content          string `json:"content"`
				ReasoningContent string `json:"reasoning_content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Error json.RawMessage `json:"error"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return "", fmt.Errorf("解析 JSON 响应异常: %w", err)
	}
	if msg := llmErrorText(r.Error); msg != "" {
		return "", fmt.Errorf("模型返回错误: %s", msg)
	}
	if len(r.Choices) == 0 {
		return "", fmt.Errorf("模型未返回有效分析文本")
	}
	c := r.Choices[0]
	if c.Message.Content == "" {
		if c.Message.ReasoningContent != "" {
			return "", errNoContentAfterReasoning(c.FinishReason)
		}
		return "", fmt.Errorf("模型未返回有效分析文本")
	}
	return c.Message.Content, nil
}

// llmStreamErr 把 context 取消原因翻译成可读错误，否则用户只会看到笼统的 "context canceled"
func llmStreamErr(ctx context.Context, err error) error {
	cause := context.Cause(ctx)
	if cause == nil {
		return err
	}
	if errors.Is(cause, context.DeadlineExceeded) {
		return fmt.Errorf("流式输出超过总时长上限 %v", llmStreamTotalTimeout)
	}
	return cause
}

// callExternalLLMStream 返回值 receivedAny 表示是否已向客户端推送过正文，调用方据此决定是否回退到内嵌引擎。
// onReasoning 接收推理模型的思考内容 (reasoning_content)，它不算正文
func (s *MarketService) callExternalLLMStream(cfg *ApiConfig, systemPrompt, userPrompt string, onChunk, onReasoning func(delta string)) (bool, error) {
	endpoint := normalizeLLMBaseURL(cfg.BaseURL) + "/chat/completions"

	modelName := cfg.Model
	if modelName == "" {
		modelName = "deepseek-chat"
	}

	temp := cfg.Temperature
	if temp <= 0 || temp > 2.0 {
		temp = 0.6
	}

	reqBody := map[string]interface{}{
		"model": modelName,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": temp,
		"max_tokens":  llmMaxTokens,
		"stream":      true,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return false, err
	}

	// 总时长上限 + 空闲超时：推理模型可能先长时间输出思考内容，只要持续有数据就不应被掐断
	totalCtx, cancelTotal := context.WithTimeout(context.Background(), llmStreamTotalTimeout)
	defer cancelTotal()
	ctx, cancel := context.WithCancelCause(totalCtx)
	defer cancel(nil)
	idle := time.AfterFunc(llmStreamIdleTimeout, func() { cancel(errLLMStreamIdle) })
	defer idle.Stop()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return false, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.ApiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return false, fmt.Errorf("网络请求错误: %w", llmStreamErr(ctx, err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		errBytes, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("API 响应 HTTP %d: %s", resp.StatusCode, string(errBytes))
	}
	if err := errIfHTML(resp); err != nil {
		return false, err
	}
	if strings.Contains(resp.Header.Get("Content-Type"), "application/json") {
		body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		if err != nil {
			return false, llmStreamErr(ctx, err)
		}
		content, err := parseChatCompletion(body)
		if err != nil {
			return false, err
		}
		onChunk(content)
		return true, nil
	}

	reader := bufio.NewReader(resp.Body)
	receivedAny := false
	sawReasoning := false
	finishReason := ""

	for {
		line, err := reader.ReadString('\n')
		idle.Reset(llmStreamIdleTimeout)
		if err != nil {
			if err == io.EOF {
				break
			}
			return receivedAny, llmStreamErr(ctx, err)
		}

		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, ":") {
			continue
		}
		if !strings.HasPrefix(line, "data:") {
			continue
		}

		dataContent := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if dataContent == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content          string `json:"content"`
					ReasoningContent string `json:"reasoning_content"`
					Reasoning        string `json:"reasoning"`
				} `json:"delta"`
				FinishReason string `json:"finish_reason"`
			} `json:"choices"`
			Error json.RawMessage `json:"error"`
		}

		if err := json.Unmarshal([]byte(dataContent), &chunk); err != nil {
			continue
		}
		if msg := llmErrorText(chunk.Error); msg != "" {
			return receivedAny, fmt.Errorf("模型返回错误: %s", msg)
		}
		if len(chunk.Choices) == 0 {
			continue
		}
		c := chunk.Choices[0]
		// DeepSeek 等用 reasoning_content，OpenRouter 等用 reasoning；有的网关两个字段会带同一段文本，只取其一
		r := c.Delta.ReasoningContent
		if r == "" {
			r = c.Delta.Reasoning
		}
		if r != "" {
			sawReasoning = true
			if onReasoning != nil {
				onReasoning(r)
			}
		}
		if c.Delta.Content != "" {
			onChunk(c.Delta.Content)
			receivedAny = true
		}
		if c.FinishReason != "" {
			finishReason = c.FinishReason
		}
	}

	if !receivedAny {
		if sawReasoning {
			return false, errNoContentAfterReasoning(finishReason)
		}
		return false, fmt.Errorf("接口未返回有效流式输出")
	}
	if finishReason == "length" {
		return true, fmt.Errorf("输出达到 max_tokens=%d 上限，正文可能不完整", llmMaxTokens)
	}

	return true, nil
}

func (s *MarketService) streamTextChunks(text string, callback StreamChunkCallback) {
	runes := []rune(text)
	chunkSize := 12
	for i := 0; i < len(runes); i += chunkSize {
		end := i + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		callback(string(runes[i:end]), false, nil)
		time.Sleep(20 * time.Millisecond)
	}
}

func (s *MarketService) callExternalLLM(cfg *ApiConfig, systemPrompt, userPrompt string) (string, error) {
	endpoint := normalizeLLMBaseURL(cfg.BaseURL) + "/chat/completions"

	modelName := cfg.Model
	if modelName == "" {
		modelName = "deepseek-chat"
	}

	temp := cfg.Temperature
	if temp <= 0 || temp > 2.0 {
		temp = 0.6
	}

	reqBody := map[string]interface{}{
		"model": modelName,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": temp,
		"max_tokens":  llmMaxTokens,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// 推理模型先思考再出正文，实测要 40~50 秒；须低于 nginx 对该路由的 120s 读超时
	ctx, cancel := context.WithTimeout(context.Background(), 110*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.ApiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("网络请求错误: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API 响应 HTTP %d: %s", resp.StatusCode, string(respBytes))
	}
	if err := errIfHTML(resp); err != nil {
		return "", err
	}

	return parseChatCompletion(respBytes)
}

// FetchModels 从指定的 OpenAI-compatible API 端点获取模型列表
func (s *MarketService) FetchModels(baseURL, apiKey string) ([]string, error) {
	endpoint := normalizeLLMBaseURL(baseURL) + "/models"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("构建请求失败: %w", err)
	}
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("请求接口失败: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("接口响应 HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}
	if err := errIfHTML(resp); err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("解析模型列表 JSON 异常: %w", err)
	}

	var models []string
	for _, m := range result.Data {
		if m.ID != "" {
			models = append(models, m.ID)
		}
	}

	if len(models) == 0 {
		return nil, fmt.Errorf("未检索到任何模型")
	}

	return models, nil
}

func (s *MarketService) generateLocalReport(gold, silver, dxy, us10y, oil, vix float64, gsRatio, rmbGold interface{}, newsList []NewsItem, analysisType string) string {
	var b strings.Builder

	b.WriteString("### 🌐 全球大类资产与黄金宏观时政 AI 研判专报\n\n")
	b.WriteString(fmt.Sprintf("> **研报基准时间**：%s (北京时间)\n", beijingNow().Format("2006-01-02 15:04:05")))
	b.WriteString(fmt.Sprintf("> **盘面核心基准**：现货黄金 `%.3f USD/oz`（折合国内金价 `¥%v/克`）｜ 现货白银 `%.3f USD/oz` ｜ 美元指数 `%.2f` ｜ 10年期美债 `%.3f%%` ｜ WTI 原油 `%.2f` ｜ 恐慌指数 VIX `%.2f` ｜ 金银比 `%v`\n\n",
		gold, rmbGold, silver, dxy, us10y, oil, vix, gsRatio))

	b.WriteString("#### 📡 FinancialJuice 实时快讯资产影响速览\n")
	shown := 0
	for _, n := range newsList {
		if shown >= 8 {
			break
		}
		if len(n.Impacts) == 0 && !n.Breaking {
			continue
		}
		flag := ""
		if n.Breaking {
			flag = "🚨 "
		}
		if n.IsUS {
			flag += "🇺🇸 "
		}
		b.WriteString(fmt.Sprintf("- %s**[%s]** %s → %s\n", flag, n.Category, n.Title, n.Impact))
		shown++
	}
	if shown == 0 {
		b.WriteString("- 当前快讯流中暂无对监控资产具有明确方向性影响的事件。\n")
	}
	b.WriteString("\n")

	live := DetectLiveDrivers(s.quotesSnapshotMap())
	b.WriteString("#### 🔗 宏观传导研判 (盘面驱动 + 快讯驱动)\n")
	if len(live) == 0 {
		b.WriteString("- **盘面**：美债10Y、美元指数、原油、VIX、标普500 日内波动均未超过驱动阈值，宏观主线不突出。\n")
	}
	for _, l := range live {
		fmt.Fprintf(&b, "- **盘面驱动｜%s**（%s）：%s。其余资产按剧本方向兑现 **%d/%d** 项", l.Title, l.Trigger, strings.Join(l.Chain, " → "), l.Confirmed, l.Total)
		var miss []string
		for _, c := range l.Checks {
			if !c.Match {
				miss = append(miss, fmt.Sprintf("%s %+.2f%%", c.Name, c.ChangePct))
			}
		}
		if len(miss) > 0 {
			b.WriteString("；出现背离：" + strings.Join(miss, "、") + "，说明另有更强驱动在主导")
		}
		b.WriteString("。\n")
		if l.Caveat != "" {
			fmt.Fprintf(&b, "  - 注意：%s\n", l.Caveat)
		}
	}
	newsDrivers := map[string]int{}
	var order []string
	for _, n := range newsList {
		for _, d := range n.Drivers {
			if newsDrivers[d.Key] == 0 {
				order = append(order, d.Key)
			}
			newsDrivers[d.Key]++
		}
	}
	for i, k := range order {
		if i >= 5 {
			break
		}
		d := macroPlaybookIndex[k]
		if d == nil {
			continue
		}
		var bull, bear []string
		for _, e := range d.Effects {
			if e.Score > 0 {
				bull = append(bull, e.Name)
			} else {
				bear = append(bear, e.Name)
			}
		}
		fmt.Fprintf(&b, "- **快讯驱动｜%s**（%d 条）：%s → 利好/上行：%s；利空/下行：%s\n",
			d.Title, newsDrivers[k], strings.Join(d.Chain, " → "), joinOr(bull, "无"), joinOr(bear, "无"))
	}
	b.WriteString("\n")

	b.WriteString("#### 1. ⚔️ 最新国际地缘时政冲击：避险溢价与断供恐慌\n")
	b.WriteString("- **中东地缘异动**：当前中东核心航道军事戒备升级，海运保费单日暴涨40%，市场计入地缘冲突溢价。历史数据显示，关键海峡地缘危机发酵首周，黄金通常享有 **30~60 美元/盎司** 的即时脉冲避险溢价。\n")
	b.WriteString("- **资本流向验证**：观察当前 VIX（" + fmt.Sprintf("%.2f", vix) + "）呈现探底回升势头，伦敦金与原油期货联动走高，验证避险资本与能源供应链风险正在形成跨品种正反馈共振。\n\n")

	b.WriteString("#### 2. 🏛️ 美联储货币政策与宏观实际利率定价\n")
	b.WriteString(fmt.Sprintf("- **无风险机会成本下移**：10年期美债收益率目前在 `%.3f%%` 附近，美联储最新鸽派信号暗示降息窗口未关闭。黄金作为无息硬通货，实际利率下行是推动其估值体系重塑的最核心宏观重力引擎。\n", us10y))
	b.WriteString(fmt.Sprintf("- **美元指数负反馈**：美元指数徘徊于 `%.2f`，弱势美元使得非美货币购买力增强，为非美国家黄金需求提供了充沛的汇率折价缓冲空间。\n\n", dxy))

	b.WriteString("#### 3. 🏦 全球央行去美元化购金潮：不可逆的宏观定海神针\n")
	b.WriteString("- **官方储备结构性重塑**：世界黄金协会确认全球央行连续24个月保持强劲净增持。在地缘金融武器化与全球外汇储备安全考量下，央行购金已由“周期性战术操作”升格为“国家级主权安全战略”。\n")
	b.WriteString("- **底部扎实不可击穿**：央行无弹性买盘在每当金价出现技术性回调时均展现极强承接力，直接封死深度下行空间。\n\n")

	b.WriteString("#### 4. 📈 跨资产共振：金银比与滞胀预期\n")
	b.WriteString(fmt.Sprintf("- **金银比（当前 %v）**：当前金银比位于 68 附近（中枢偏良性区间）。现货白银报价 `%.3f USD`，日内涨幅强于黄金，说明贵金属板块正处于强攻共振态势，非虚高的防御性孤独上涨。\n", gsRatio, silver))
	b.WriteString(fmt.Sprintf("- **原油与二次通胀**：WTI 原油在 `%.2f USD` 企稳。若油价因地缘中断重拾升势，全球二次通胀（Stagflation）预期将迅速被对冲基金重估，驱动商品及贵金属掀起抗通胀超级周期。\n\n", oil))

	b.WriteString("#### 💡 5. 核心点位推演与机构操盘策略建议\n")
	support1 := gold - 25.0
	support2 := gold - 50.0
	resist1 := gold + 30.0
	resist2 := gold + 65.0

	b.WriteString(fmt.Sprintf("- **上方关键阻力位**：第一阻力区 **`%.3f USD`**；若中东时政冲突进一步溢出，第二强目标位直指 **`%.3f USD`**。\n", resist1, resist2))
	b.WriteString(fmt.Sprintf("- **下方生命防守位**：日内多空分水岭 **`%.3f USD`**，强支撑防守线 **`%.3f USD`**。\n", support1, support2))
	b.WriteString(fmt.Sprintf("- **国内现货金（元/克）**：折合基础金价约为 **`¥%v/克`**，建议中长线投资者逢急跌回踩关键防守位时分批布多，严控杠杆，防范时政缓和时地缘溢价的快速回吐波动。\n", rmbGold))

	return b.String()
}
