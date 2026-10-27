package handler

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type MarketHandler struct {
	marketService *service.MarketService
}

func NewMarketHandler() *MarketHandler {
	return &MarketHandler{
		marketService: service.NewMarketService(),
	}
}

// HandleWebSocket 处理已登录用户的 WSS 长连接
func (h *MarketHandler) HandleWebSocket(c *websocket.Conn) {
	// topic=news: 全局快讯弹窗只订阅快讯；topic=stocks: 美股页面只接收美股跳价
	topic := service.ParseTopic(c.Query("topic"))
	hub := h.marketService.GetHub()
	client := hub.Register(c, topic)
	defer hub.Unregister(client)
	defer h.marketService.UnsubscribeKline(client)

	// 启动专属写协程 (10秒宽裕写超时，绝不因跨国网络延迟阻塞推流)
	go client.WriteLoop()

	initMsgs := [][]byte{}
	switch topic {
	case service.TopicMarket:
		// 连接成功后，立即向客户端推送一份数据库中的最新全量行情快照 (北京时间)
		quotes, derived, _ := h.marketService.GetMarketQuotes()
		b, _ := json.Marshal(map[string]interface{}{
			"type":      "init_quotes",
			"quotes":    quotes,
			"derived":   derived,
			"timestamp": service.BeijingNow().Format("15:04:05"),
		})
		initMsgs = append(initMsgs, b)
		// 每次 (重新) 连接都下发一次快讯快照，断线期间漏掉的快讯由此补齐，前端无需轮询
		nb, _ := json.Marshal(map[string]interface{}{
			"type":   "init_news",
			"news":   h.marketService.GetLatestNews(),
			"status": h.marketService.NewsStatus(),
		})
		initMsgs = append(initMsgs, nb)
	case service.TopicStocks:
		snap := h.marketService.GetStocks()
		b, _ := json.Marshal(map[string]interface{}{
			"type":      "init_stocks",
			"groups":    snap.Groups,
			"stocks":    snap.Stocks,
			"status":    snap.Status,
			"timestamp": service.BeijingNow().Format("15:04:05"),
		})
		initMsgs = append(initMsgs, b)
	default:
		sb, _ := json.Marshal(map[string]interface{}{"type": "news_status", "status": h.marketService.NewsStatus()})
		initMsgs = append(initMsgs, sb)
	}
	for _, m := range initMsgs {
		select {
		case client.Send <- m:
		default:
		}
	}

	// 读循环：监听客户端心跳与退出 (60秒长超时)
	for {
		_ = c.SetReadDeadline(time.Now().Add(60 * time.Second))
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}
		if string(msg) == "ping" {
			select {
			case client.Send <- []byte("pong"):
			default:
			}
			continue
		}

		var req struct {
			Type     string `json:"type"`
			Symbol   string `json:"symbol"`
			Interval string `json:"interval"`
		}
		if json.Unmarshal(msg, &req) != nil {
			continue
		}
		switch req.Type {
		case "kline_sub":
			// 首次订阅可能需要拨号 TradingView，放到协程里避免阻塞读循环
			go func(symbol, interval string) {
				if err := h.marketService.SubscribeKline(client, symbol, interval); err != nil {
					b, _ := json.Marshal(map[string]interface{}{
						"type": "kline_error", "symbol": symbol, "interval": interval, "message": err.Error(),
					})
					hub.SendTo(client, b)
				}
			}(req.Symbol, req.Interval)
		case "kline_unsub":
			h.marketService.UnsubscribeKline(client)
		}
	}
	log.Printf("[Market WSS] 连接结束，已安全释放资源")
}

// GetKlines 返回指定标的与周期的 K 线；传 before (Unix 秒) 时从本地归档向前翻页
func (h *MarketHandler) GetKlines(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	interval := c.Query("interval", "15")
	var before int64
	if v := c.Query("before"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": 400, "message": "before 参数无效"})
		}
		before = n
	}
	bars, source, err := h.marketService.GetKlines(symbol, interval, c.QueryInt("limit", 0), before)
	if errors.Is(err, service.ErrKlineBadRequest) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"code": 400, "message": err.Error()})
	}
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"code": 502, "message": err.Error()})
	}
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"symbol":   symbol,
			"interval": interval,
			"source":   source,
			"bars":     bars,
		},
	})
}

// GetQuotes 返回实时跨资产行情与衍生指标
func (h *MarketHandler) GetQuotes(c *fiber.Ctx) error {
	quotes, derived, err := h.marketService.GetMarketQuotes()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取行情数据失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"quotes":  quotes,
			"derived": derived,
		},
	})
}

// GetNews 返回 FinancialJuice 实时快讯快照与数据流状态 (实时增量通过 WSS news_flash 推送)
func (h *MarketHandler) GetNews(c *fiber.Ctx) error {
	news := h.marketService.GetLatestNews()
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    news,
		"status":  h.marketService.NewsStatus(),
	})
}

// GetStocks 返回美股核心科技股分组与实时报价快照
func (h *MarketHandler) GetStocks(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    h.marketService.GetStocks(),
	})
}

// GetPlaybook 返回宏观传导关系剧本 (事件 → 传导链 → 各资产方向与原因) 及盘面实时触发情况
func (h *MarketHandler) GetPlaybook(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    h.marketService.GetPlaybook(),
	})
}

// GetMacro 返回各国 CPI/PPI 数据快照 (新发布通过 WSS macro_release 推送)
func (h *MarketHandler) GetMacro(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    h.marketService.GetMacroData(),
	})
}

// AnalyzeAi 执行结合盘面与时政新闻的宏观智能研判
func (h *MarketHandler) AnalyzeAi(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req service.MarketAnalysisRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数无效",
		})
	}

	resp, err := h.marketService.AnalyzeMarket(req, userID, username, roleCode, c.IP())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "AI 宏观分析失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    resp,
	})
}

// AnalyzeAiStream 执行以流式 SSE 格式输出的宏观智能研判研报
func (h *MarketHandler) AnalyzeAiStream(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req service.MarketAnalysisRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数无效",
		})
	}

	clientIP := c.IP()

	c.Set("Content-Type", "text/event-stream; charset=utf-8")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("[AnalyzeAiStream Panic Recovered] %v\n", r)
			}
		}()

		h.marketService.StreamAnalyzeMarket(req, userID, username, roleCode, clientIP, func(delta string, done bool, meta map[string]interface{}) {
			payload := map[string]interface{}{
				"delta": delta,
				"done":  done,
			}
			for k, v := range meta {
				payload[k] = v
			}
			b, _ := json.Marshal(payload)
			fmt.Fprintf(w, "data: %s\n\n", string(b))
			_ = w.Flush()
		})
		fmt.Fprintf(w, "data: [DONE]\n\n")
		_ = w.Flush()
	})

	return nil
}

// FetchModels 从配置的 API 获取可用模型列表
func (h *MarketHandler) FetchModels(c *fiber.Ctx) error {
	var req struct {
		BaseURL string `json:"baseUrl"`
		ApiKey  string `json:"apiKey"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数无效",
		})
	}

	models, err := h.marketService.FetchModels(req.BaseURL, req.ApiKey)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "获取模型列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    models,
	})
}

