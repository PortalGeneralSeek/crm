package service

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"

	tvws "github.com/fasthttp/websocket"
	"gorm.io/gorm/clause"
)

// StockGroup 美股核心科技板块分组
type StockGroup struct {
	Key   string `json:"key"`
	Title string `json:"title"`
	Desc  string `json:"desc"`
}

// StockDef 监控标的静态定义
type StockDef struct {
	Symbol string `json:"symbol"`
	Ticker string `json:"ticker"`
	Name   string `json:"name"`
	Group  string `json:"group"`
	Tag    string `json:"tag"` // 产业链定位
}

var usStockGroups = []StockGroup{
	{Key: "index", Title: "指数与 ETF", Desc: "费城半导体、纳指100 与半导体 ETF，衡量板块整体温度"},
	{Key: "compute", Title: "AI 算力芯片", Desc: "GPU / 定制 ASIC / CPU 设计与晶圆代工"},
	{Key: "memory", Title: "存储", Desc: "HBM / DRAM / NAND 闪存与机械硬盘"},
	{Key: "optical", Title: "光通信与互联", Desc: "光模块、激光器、光纤与数据中心高速互联"},
	{Key: "equipment", Title: "半导体设备", Desc: "光刻、刻蚀、沉积、量测与测试"},
	{Key: "eda", Title: "EDA 与 IP", Desc: "芯片设计软件与架构授权，芯片设计的上游工具"},
	{Key: "analog", Title: "模拟与功率芯片", Desc: "模拟、电源管理、汽车与工业芯片，周期复苏风向标"},
	{Key: "server", Title: "AI 服务器与算力云", Desc: "AI 服务器整机、代工与 GPU 算力租赁 (Neocloud)"},
	{Key: "power", Title: "AI 电力与能源", Desc: "数据中心供电、散热、电网设备与核电"},
	{Key: "software", Title: "AI 软件与应用", Desc: "企业软件、数据平台与 AI 应用变现"},
	{Key: "security", Title: "网络安全", Desc: "终端、云与网络安全平台"},
	{Key: "bigtech", Title: "科技巨头", Desc: "云厂商与终端巨头，AI 资本开支的主要买方"},
	{Key: "china", Title: "中概科技", Desc: "在美上市的中国互联网与 AI 龙头 (ADR)"},
}

// usStocks 用 TVC 指数而不是 NASDAQ:SOX/NDX：后者对匿名会话是 15 分钟延迟。
// SK海力士/三星只在韩国上市，台积电本土股在台湾，这三只匿名会话为 15-20 分钟延迟行情。
var usStocks = []StockDef{
	{Symbol: "TVC:SOX", Ticker: "SOX", Name: "费城半导体指数", Group: "index", Tag: "半导体板块基准"},
	{Symbol: "TVC:NDX", Ticker: "NDX", Name: "纳斯达克100指数", Group: "index", Tag: "科技成长基准"},
	{Symbol: "NASDAQ:SMH", Ticker: "SMH", Name: "VanEck 半导体 ETF", Group: "index", Tag: "半导体 ETF"},
	{Symbol: "AMEX:IGV", Ticker: "IGV", Name: "iShares 软件 ETF", Group: "index", Tag: "软件板块 ETF"},

	{Symbol: "NASDAQ:NVDA", Ticker: "NVDA", Name: "英伟达", Group: "compute", Tag: "AI GPU 龙头"},
	{Symbol: "NYSE:TSM", Ticker: "TSM", Name: "台积电 (ADR)", Group: "compute", Tag: "先进制程 / CoWoS 封装"},
	{Symbol: "TWSE:2330", Ticker: "2330", Name: "台积电 (台股)", Group: "compute", Tag: "台湾本土股 · 延迟"},
	{Symbol: "NASDAQ:AVGO", Ticker: "AVGO", Name: "博通", Group: "compute", Tag: "定制 ASIC / 以太网交换"},
	{Symbol: "NASDAQ:AMD", Ticker: "AMD", Name: "超威半导体 AMD", Group: "compute", Tag: "GPU / CPU"},
	{Symbol: "NASDAQ:MRVL", Ticker: "MRVL", Name: "迈威尔科技", Group: "compute", Tag: "定制 ASIC / 光 DSP"},
	{Symbol: "NASDAQ:QCOM", Ticker: "QCOM", Name: "高通", Group: "compute", Tag: "移动 SoC / 端侧 AI"},
	{Symbol: "NASDAQ:INTC", Ticker: "INTC", Name: "英特尔", Group: "compute", Tag: "CPU / 晶圆代工"},

	{Symbol: "KRX:000660", Ticker: "000660", Name: "SK 海力士", Group: "memory", Tag: "HBM 龙头 · 韩股延迟"},
	{Symbol: "KRX:005930", Ticker: "005930", Name: "三星电子", Group: "memory", Tag: "DRAM / NAND · 韩股延迟"},
	{Symbol: "NASDAQ:MU", Ticker: "MU", Name: "美光科技", Group: "memory", Tag: "HBM / DRAM / NAND"},
	{Symbol: "NASDAQ:SNDK", Ticker: "SNDK", Name: "闪迪", Group: "memory", Tag: "NAND 闪存 / SSD"},
	{Symbol: "NASDAQ:WDC", Ticker: "WDC", Name: "西部数据", Group: "memory", Tag: "数据中心机械硬盘"},
	{Symbol: "NASDAQ:STX", Ticker: "STX", Name: "希捷科技", Group: "memory", Tag: "HAMR 大容量硬盘"},
	{Symbol: "NYSE:PSTG", Ticker: "PSTG", Name: "Everpure (原 Pure Storage)", Group: "memory", Tag: "企业级全闪存储"},

	{Symbol: "NASDAQ:LITE", Ticker: "LITE", Name: "Lumentum", Group: "optical", Tag: "EML 激光器 / 光模块"},
	{Symbol: "NYSE:GLW", Ticker: "GLW", Name: "康宁", Group: "optical", Tag: "光纤光缆 / 特种玻璃"},
	{Symbol: "NYSE:COHR", Ticker: "COHR", Name: "Coherent 相干", Group: "optical", Tag: "800G/1.6T 光模块"},
	{Symbol: "NYSE:CIEN", Ticker: "CIEN", Name: "Ciena", Group: "optical", Tag: "光传输设备"},
	{Symbol: "NYSE:FN", Ticker: "FN", Name: "Fabrinet", Group: "optical", Tag: "光器件代工"},
	{Symbol: "NASDAQ:CRDO", Ticker: "CRDO", Name: "Credo", Group: "optical", Tag: "AEC 有源铜缆 / SerDes"},
	{Symbol: "NASDAQ:ALAB", Ticker: "ALAB", Name: "Astera Labs", Group: "optical", Tag: "PCIe / CXL 互联"},
	{Symbol: "NYSE:ANET", Ticker: "ANET", Name: "Arista 网络", Group: "optical", Tag: "数据中心交换机"},
	{Symbol: "NASDAQ:AAOI", Ticker: "AAOI", Name: "应用光电 AAOI", Group: "optical", Tag: "数据中心光模块"},
	{Symbol: "NYSE:APH", Ticker: "APH", Name: "安费诺", Group: "optical", Tag: "高速连接器 / 铜缆互联"},

	{Symbol: "NASDAQ:ASML", Ticker: "ASML", Name: "阿斯麦", Group: "equipment", Tag: "EUV 光刻机"},
	{Symbol: "NASDAQ:AMAT", Ticker: "AMAT", Name: "应用材料", Group: "equipment", Tag: "沉积 / 刻蚀"},
	{Symbol: "NASDAQ:LRCX", Ticker: "LRCX", Name: "泛林集团", Group: "equipment", Tag: "刻蚀 / 存储设备"},
	{Symbol: "NASDAQ:KLAC", Ticker: "KLAC", Name: "科磊", Group: "equipment", Tag: "量测 / 检测"},
	{Symbol: "NASDAQ:TER", Ticker: "TER", Name: "泰瑞达", Group: "equipment", Tag: "芯片测试设备 (HBM / SoC)"},

	{Symbol: "NASDAQ:SNPS", Ticker: "SNPS", Name: "新思科技", Group: "eda", Tag: "EDA / 接口 IP"},
	{Symbol: "NASDAQ:CDNS", Ticker: "CDNS", Name: "楷登电子", Group: "eda", Tag: "EDA / 仿真验证"},
	{Symbol: "NASDAQ:ARM", Ticker: "ARM", Name: "ARM", Group: "eda", Tag: "CPU 架构授权"},

	{Symbol: "NASDAQ:TXN", Ticker: "TXN", Name: "德州仪器", Group: "analog", Tag: "模拟 / 嵌入式处理"},
	{Symbol: "NASDAQ:ADI", Ticker: "ADI", Name: "亚德诺半导体", Group: "analog", Tag: "高性能模拟 / 数据转换"},
	{Symbol: "NASDAQ:NXPI", Ticker: "NXPI", Name: "恩智浦", Group: "analog", Tag: "汽车 / 工业芯片"},
	{Symbol: "NASDAQ:ON", Ticker: "ON", Name: "安森美", Group: "analog", Tag: "碳化硅 / 功率器件"},
	{Symbol: "NASDAQ:MCHP", Ticker: "MCHP", Name: "微芯科技", Group: "analog", Tag: "MCU / 模拟"},

	{Symbol: "NYSE:DELL", Ticker: "DELL", Name: "戴尔科技", Group: "server", Tag: "AI 服务器整机"},
	{Symbol: "NASDAQ:SMCI", Ticker: "SMCI", Name: "超微电脑", Group: "server", Tag: "AI 服务器 / 液冷机柜"},
	{Symbol: "NYSE:HPE", Ticker: "HPE", Name: "慧与科技", Group: "server", Tag: "服务器 / 网络 (Juniper)"},
	{Symbol: "NYSE:CLS", Ticker: "CLS", Name: "天弘科技 Celestica", Group: "server", Tag: "ASIC 服务器 / 交换机代工"},
	{Symbol: "NASDAQ:CRWV", Ticker: "CRWV", Name: "CoreWeave", Group: "server", Tag: "GPU 算力云"},
	{Symbol: "NASDAQ:NBIS", Ticker: "NBIS", Name: "Nebius", Group: "server", Tag: "GPU 算力云"},

	{Symbol: "NYSE:VRT", Ticker: "VRT", Name: "维谛技术", Group: "power", Tag: "数据中心供电 / 液冷"},
	{Symbol: "NYSE:ETN", Ticker: "ETN", Name: "伊顿", Group: "power", Tag: "配电 / 电气设备"},
	{Symbol: "NYSE:GEV", Ticker: "GEV", Name: "GE Vernova", Group: "power", Tag: "燃气轮机 / 电网设备"},
	{Symbol: "NASDAQ:CEG", Ticker: "CEG", Name: "星座能源", Group: "power", Tag: "核电 / 数据中心购电协议"},
	{Symbol: "NYSE:VST", Ticker: "VST", Name: "Vistra", Group: "power", Tag: "独立发电商"},
	{Symbol: "NYSE:OKLO", Ticker: "OKLO", Name: "Oklo", Group: "power", Tag: "小型模块化核反应堆"},

	{Symbol: "NASDAQ:PLTR", Ticker: "PLTR", Name: "Palantir", Group: "software", Tag: "AI 数据分析平台"},
	{Symbol: "NYSE:CRM", Ticker: "CRM", Name: "Salesforce", Group: "software", Tag: "CRM / Agentforce"},
	{Symbol: "NYSE:NOW", Ticker: "NOW", Name: "ServiceNow", Group: "software", Tag: "企业工作流 / AI Agent"},
	{Symbol: "NYSE:SNOW", Ticker: "SNOW", Name: "Snowflake", Group: "software", Tag: "云数据仓库"},
	{Symbol: "NASDAQ:ADBE", Ticker: "ADBE", Name: "Adobe", Group: "software", Tag: "创意软件 / 生成式 AI"},
	{Symbol: "NASDAQ:APP", Ticker: "APP", Name: "AppLovin", Group: "software", Tag: "AI 广告引擎"},

	{Symbol: "NASDAQ:CRWD", Ticker: "CRWD", Name: "CrowdStrike", Group: "security", Tag: "终端安全 / XDR"},
	{Symbol: "NASDAQ:PANW", Ticker: "PANW", Name: "Palo Alto Networks", Group: "security", Tag: "防火墙 / 安全平台"},
	{Symbol: "NYSE:NET", Ticker: "NET", Name: "Cloudflare", Group: "security", Tag: "边缘网络 / 零信任"},
	{Symbol: "NASDAQ:ZS", Ticker: "ZS", Name: "Zscaler", Group: "security", Tag: "云安全访问"},
	{Symbol: "NASDAQ:FTNT", Ticker: "FTNT", Name: "飞塔 Fortinet", Group: "security", Tag: "网络安全硬件"},

	{Symbol: "NASDAQ:MSFT", Ticker: "MSFT", Name: "微软", Group: "bigtech", Tag: "Azure 云"},
	{Symbol: "NASDAQ:GOOGL", Ticker: "GOOGL", Name: "谷歌", Group: "bigtech", Tag: "GCP 云 / TPU"},
	{Symbol: "NASDAQ:AMZN", Ticker: "AMZN", Name: "亚马逊", Group: "bigtech", Tag: "AWS 云 / Trainium"},
	{Symbol: "NASDAQ:META", Ticker: "META", Name: "Meta", Group: "bigtech", Tag: "AI 资本开支大户"},
	{Symbol: "NASDAQ:AAPL", Ticker: "AAPL", Name: "苹果", Group: "bigtech", Tag: "消费电子 / 端侧 AI"},
	{Symbol: "NYSE:ORCL", Ticker: "ORCL", Name: "甲骨文", Group: "bigtech", Tag: "OCI 云 / AI 数据中心"},
	{Symbol: "NASDAQ:TSLA", Ticker: "TSLA", Name: "特斯拉", Group: "bigtech", Tag: "电动车 / 自动驾驶"},

	{Symbol: "NYSE:BABA", Ticker: "BABA", Name: "阿里巴巴", Group: "china", Tag: "阿里云 / 通义大模型"},
	{Symbol: "NASDAQ:PDD", Ticker: "PDD", Name: "拼多多", Group: "china", Tag: "电商 / Temu"},
	{Symbol: "NASDAQ:BIDU", Ticker: "BIDU", Name: "百度", Group: "china", Tag: "文心大模型 / 萝卜快跑"},
}

// UsStockSymbols 返回美股监控标的代码 (同时作为 K 线白名单)
func UsStockSymbols() []string {
	out := make([]string, 0, len(usStocks))
	for _, s := range usStocks {
		out = append(out, s.Symbol)
	}
	return out
}

// StockQuote 单只股票的实时报价
type StockQuote struct {
	StockDef
	Description string  `json:"description"`
	Exchange    string  `json:"exchange"`
	Currency    string  `json:"currency"`
	Price       float64 `json:"price"`
	Change      float64 `json:"change"`
	ChangePct   float64 `json:"changePct"`
	Open        float64 `json:"open"`
	High        float64 `json:"high"`
	Low         float64 `json:"low"`
	PrevClose   float64 `json:"prevClose"`
	Bid         float64 `json:"bid"`
	Ask         float64 `json:"ask"`
	Volume      float64 `json:"volume"`
	MarketCap   float64 `json:"marketCap"`
	PE          float64 `json:"pe"`
	High52      float64 `json:"high52"`
	Low52       float64 `json:"low52"`
	// 盘前/盘后价 (TradingView rtc 字段)，常规交易时段为 0
	ExtPrice     float64 `json:"extPrice"`
	ExtChange    float64 `json:"extChange"`
	ExtChangePct float64 `json:"extChangePct"`
	// Session: market / pre_market / post_market / out_of_session
	Session    string `json:"session"`
	UpdateMode string `json:"updateMode"`
	DelayMin   int    `json:"delayMin"`
	PriceScale int    `json:"priceScale"`
	LastTrade  int64  `json:"lastTrade"` // 最新成交时间 (Unix 秒)
	UpdatedAt  string `json:"updatedAt"`
	Error      string `json:"error,omitempty"`
}

// StockStreamStatus 美股行情数据流状态
type StockStreamStatus struct {
	Connected   bool   `json:"connected"`
	Source      string `json:"source"`
	Symbols     int    `json:"symbols"`
	Ready       int    `json:"ready"`
	LastTickAt  string `json:"lastTickAt"`
	ConnectedAt string `json:"connectedAt"`
	Reconnects  int    `json:"reconnects"`
}

// StockSnapshot GET /market/stocks 与 WSS init_stocks 的数据结构
type StockSnapshot struct {
	Groups []StockGroup      `json:"groups"`
	Stocks []StockQuote      `json:"stocks"`
	Status StockStreamStatus `json:"status"`
}

const (
	stockTickInterval      = 500 * time.Millisecond
	stockFullSnapshotEvery = 15 * time.Second
	// 远程 OceanBase 单次批量 upsert 约数百毫秒，5 秒合并一次足以保留最新一份
	stockPersistInterval = 5 * time.Second
)

var stockQuoteFields = []interface{}{
	"lp", "lp_time", "ch", "chp", "description", "exchange", "currency_code",
	"bid", "ask", "high_price", "low_price", "open_price", "prev_close_price",
	"volume", "market_cap_basic", "price_earnings_ttm", "price_52_week_high", "price_52_week_low",
	"rtc", "rch", "rchp", "current_session", "update_mode", "pricescale",
}

// UsStockMonitor 独立维护一条 TradingView 报价连接订阅美股核心科技股，
// 与大类资产报价连接隔离，避免一边订阅出错拖垮另一边。
type UsStockMonitor struct {
	hub *MarketHub

	mu      sync.RWMutex
	quotes  map[string]*StockQuote
	changed map[string]struct{} // 待推送前端
	dirty   map[string]struct{} // 待写入数据库
	status  StockStreamStatus
}

func NewUsStockMonitor(hub *MarketHub) *UsStockMonitor {
	m := &UsStockMonitor{
		hub:     hub,
		quotes:  make(map[string]*StockQuote, len(usStocks)),
		changed: make(map[string]struct{}),
		dirty:   make(map[string]struct{}),
		status:  StockStreamStatus{Source: "TradingView", Symbols: len(usStocks)},
	}
	for _, d := range usStocks {
		m.quotes[d.Symbol] = &StockQuote{StockDef: d}
	}
	m.loadFromDB()
	return m
}

func (m *UsStockMonitor) Start() {
	go m.runBridge()
	go m.runBroadcaster()
	go m.runPersistence()
}

func delayMinutes(mode string) int {
	if !strings.HasPrefix(mode, "delayed") {
		return 0
	}
	i := strings.LastIndex(mode, "_")
	if i < 0 {
		return 0
	}
	sec, err := strconv.Atoi(mode[i+1:])
	if err != nil {
		return 0
	}
	return sec / 60
}

// loadFromDB 用数据库里最近一次保存的报价预热内存，TradingView 连上之前页面也有数据
func (m *UsStockMonitor) loadFromDB() {
	if database.DB == nil {
		return
	}
	var rows []model.CrmUsStockQuote
	if err := klineArchiveDB().Find(&rows).Error; err != nil {
		log.Printf("[US Stocks] 读取数据库报价失败: %v", err)
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range rows {
		q, ok := m.quotes[r.Symbol]
		if !ok || r.Price <= 0 {
			continue
		}
		q.Exchange, q.Currency = r.Exchange, r.Currency
		q.Price, q.Change, q.ChangePct = r.Price, r.Change, r.ChangePct
		q.Open, q.High, q.Low, q.PrevClose = r.Open, r.High, r.Low, r.PrevClose
		q.Bid, q.Ask, q.Volume = r.Bid, r.Ask, r.Volume
		q.MarketCap, q.PE, q.High52, q.Low52 = r.MarketCap, r.PE, r.High52, r.Low52
		q.ExtPrice, q.ExtChange, q.ExtChangePct = r.ExtPrice, r.ExtChange, r.ExtChangePct
		q.Session, q.UpdateMode, q.DelayMin = r.Session, r.UpdateMode, delayMinutes(r.UpdateMode)
		q.PriceScale, q.LastTrade = r.PriceScale, r.LastTrade
		q.UpdatedAt = r.UpdatedAt.In(beijingLoc).Format("15:04:05")
	}
	if len(rows) > 0 {
		log.Printf("[US Stocks] 已从数据库预热 %d 只股票的最近报价", len(rows))
	}
}

func (m *UsStockMonitor) runPersistence() {
	ticker := time.NewTicker(stockPersistInterval)
	defer ticker.Stop()
	for range ticker.C {
		if database.DB == nil {
			continue
		}
		m.mu.Lock()
		dirty := m.dirty
		if len(dirty) > 0 {
			m.dirty = make(map[string]struct{})
		}
		var rows []model.CrmUsStockQuote
		now := time.Now()
		for sym := range dirty {
			q := m.quotes[sym]
			if q == nil || q.Price <= 0 {
				continue
			}
			rows = append(rows, model.CrmUsStockQuote{
				Symbol: q.Symbol, Ticker: q.Ticker, Name: q.Name, GroupKey: q.Group,
				Exchange: q.Exchange, Currency: q.Currency,
				Price: q.Price, Change: q.Change, ChangePct: q.ChangePct,
				Open: q.Open, High: q.High, Low: q.Low, PrevClose: q.PrevClose,
				Bid: q.Bid, Ask: q.Ask, Volume: q.Volume,
				MarketCap: q.MarketCap, PE: q.PE, High52: q.High52, Low52: q.Low52,
				ExtPrice: q.ExtPrice, ExtChange: q.ExtChange, ExtChangePct: q.ExtChangePct,
				Session: q.Session, UpdateMode: q.UpdateMode, PriceScale: q.PriceScale, LastTrade: q.LastTrade,
				UpdatedAt: now,
			})
		}
		m.mu.Unlock()
		if len(rows) == 0 {
			continue
		}
		if err := klineArchiveDB().Clauses(clause.OnConflict{UpdateAll: true}).Create(&rows).Error; err != nil {
			log.Printf("[US Stocks] 写入数据库失败 (%d 只，下轮重试): %v", len(rows), err)
			m.mu.Lock()
			for _, r := range rows {
				m.dirty[r.Symbol] = struct{}{}
			}
			m.mu.Unlock()
		}
	}
}

// Snapshot 按配置顺序返回全部股票报价
func (m *UsStockMonitor) Snapshot() StockSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return StockSnapshot{Groups: usStockGroups, Stocks: m.listLocked(nil), Status: m.statusLocked()}
}

func (m *UsStockMonitor) listLocked(only map[string]struct{}) []StockQuote {
	out := make([]StockQuote, 0, len(usStocks))
	for _, d := range usStocks {
		if only != nil {
			if _, ok := only[d.Symbol]; !ok {
				continue
			}
		}
		out = append(out, *m.quotes[d.Symbol])
	}
	return out
}

func (m *UsStockMonitor) statusLocked() StockStreamStatus {
	st := m.status
	st.Ready = 0
	for _, q := range m.quotes {
		if q.Price > 0 {
			st.Ready++
		}
	}
	return st
}

func (m *UsStockMonitor) runBridge() {
	headers := http.Header{}
	headers.Set("Origin", "https://cn.tradingview.com")
	headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	symbols := UsStockSymbols()

	for attempt := 0; ; attempt++ {
		if attempt > 0 {
			m.mu.Lock()
			m.status.Connected = false
			m.status.Reconnects++
			m.mu.Unlock()
			time.Sleep(3 * time.Second)
		}
		dialer := *tvws.DefaultDialer
		dialer.HandshakeTimeout = 10 * time.Second
		conn, _, err := dialer.Dial("wss://data.tradingview.com/socket.io/websocket", headers)
		if err != nil {
			log.Printf("[US Stocks] 连接 TradingView 失败: %v，3 秒后重试", err)
			continue
		}

		sid := "qs_" + randomString(10)
		send := func(obj interface{}) error {
			_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			return conn.WriteMessage(tvws.TextMessage, []byte(formatTVMsg(obj)))
		}
		subParams := append([]string{sid}, symbols...)
		// quote_fast_symbols 是整体替换语义，必须一次提交完整列表，否则只有最后一只保持实时
		msgs := []map[string]interface{}{
			{"m": "set_auth_token", "p": []string{"unauthorized_user_token"}},
			{"m": "quote_create_session", "p": []string{sid}},
			{"m": "quote_set_fields", "p": append([]interface{}{sid}, stockQuoteFields...)},
			{"m": "quote_add_symbols", "p": subParams},
			{"m": "quote_fast_symbols", "p": subParams},
		}
		failed := false
		for _, msg := range msgs {
			if err := send(msg); err != nil {
				failed = true
				break
			}
		}
		if failed {
			_ = conn.Close()
			continue
		}

		m.mu.Lock()
		m.status.Connected = true
		m.status.ConnectedAt = beijingNow().Format(time.RFC3339)
		m.mu.Unlock()
		log.Printf("[US Stocks] 已连接 TradingView，订阅 %d 只美股核心科技标的 (会话 %s)", len(symbols), sid)

		for {
			_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
			_, raw, err := conn.ReadMessage()
			if err != nil {
				log.Printf("[US Stocks] 读取中断: %v，准备重连", err)
				break
			}
			text := string(raw)
			if strings.Contains(text, "~h~") {
				for _, hb := range tvHeartbeatRe.FindAllString(text, -1) {
					_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
					_ = conn.WriteMessage(tvws.TextMessage, []byte(formatTVRaw(hb)))
				}
			}
			for _, part := range tvSplitRe.Split(text, -1) {
				if part == "" || strings.HasPrefix(part, "~h~") {
					continue
				}
				var packet struct {
					M string            `json:"m"`
					P []json.RawMessage `json:"p"`
				}
				if json.Unmarshal([]byte(part), &packet) != nil || packet.M != "qsd" || len(packet.P) < 2 {
					continue
				}
				var data struct {
					N string                 `json:"n"`
					S string                 `json:"s"`
					V map[string]interface{} `json:"v"`
				}
				if json.Unmarshal(packet.P[1], &data) != nil {
					continue
				}
				m.apply(data.N, data.S, data.V)
			}
		}
		_ = conn.Close()
	}
}

// apply 合并一帧 qsd 增量。TradingView 只推送变化的字段；字段值为 null 表示被清空
// (例如开盘后盘前价 rtc 失效)，因此要区分"未出现"与"出现但为 null"。
func (m *UsStockMonitor) apply(symbol, status string, v map[string]interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	q, ok := m.quotes[symbol]
	if !ok {
		return
	}
	if status == "error" {
		q.Error = "TradingView 返回该标的无数据"
		m.changed[symbol] = struct{}{}
		return
	}
	q.Error = ""

	num := func(key string, dst *float64) {
		if raw, present := v[key]; present {
			if f, ok := raw.(float64); ok {
				*dst = f
			} else if raw == nil {
				*dst = 0
			}
		}
	}
	str := func(key string, dst *string) {
		if s, ok := v[key].(string); ok {
			*dst = s
		}
	}

	num("lp", &q.Price)
	num("ch", &q.Change)
	num("chp", &q.ChangePct)
	num("open_price", &q.Open)
	num("high_price", &q.High)
	num("low_price", &q.Low)
	num("prev_close_price", &q.PrevClose)
	num("bid", &q.Bid)
	num("ask", &q.Ask)
	num("volume", &q.Volume)
	num("market_cap_basic", &q.MarketCap)
	num("price_earnings_ttm", &q.PE)
	num("price_52_week_high", &q.High52)
	num("price_52_week_low", &q.Low52)
	num("rtc", &q.ExtPrice)
	num("rch", &q.ExtChange)
	num("rchp", &q.ExtChangePct)
	str("description", &q.Description)
	str("exchange", &q.Exchange)
	str("currency_code", &q.Currency)
	str("current_session", &q.Session)
	if mode, ok := v["update_mode"].(string); ok {
		q.UpdateMode = mode
		q.DelayMin = delayMinutes(mode)
	}
	if ps, ok := v["pricescale"].(float64); ok && ps > 0 {
		q.PriceScale = int(ps)
	}
	if t, ok := v["lp_time"].(float64); ok {
		q.LastTrade = int64(t)
	}
	// 指数的 volume 是占位值 1e100
	if q.Volume >= 1e90 {
		q.Volume = 0
	}
	now := beijingNow()
	q.UpdatedAt = now.Format("15:04:05")
	m.status.LastTickAt = now.Format(time.RFC3339)
	m.changed[symbol] = struct{}{}
	m.dirty[symbol] = struct{}{}
}

// runBroadcaster 只给打开美股页面 (topic=stocks) 的客户端推送：每 500ms 合并一帧增量，定期补全量快照自愈丢帧
func (m *UsStockMonitor) runBroadcaster() {
	ticker := time.NewTicker(stockTickInterval)
	defer ticker.Stop()
	var lastFull time.Time
	for range ticker.C {
		if m.hub.TopicCount(TopicStocks) == 0 {
			continue
		}
		full := time.Since(lastFull) >= stockFullSnapshotEvery
		m.mu.Lock()
		changed := m.changed
		if len(changed) > 0 {
			m.changed = make(map[string]struct{})
		}
		if len(changed) == 0 && !full {
			m.mu.Unlock()
			continue
		}
		var list []StockQuote
		if full {
			list = m.listLocked(nil)
		} else {
			list = m.listLocked(changed)
		}
		st := m.statusLocked()
		m.mu.Unlock()

		b, err := json.Marshal(map[string]interface{}{
			"type":      "stock_tick",
			"full":      full,
			"stocks":    list,
			"status":    st,
			"timestamp": beijingNow().Format("15:04:05"),
		})
		if err != nil {
			continue
		}
		m.hub.BroadcastTopic(TopicStocks, b)
		if full {
			lastFull = time.Now()
		}
	}
}
