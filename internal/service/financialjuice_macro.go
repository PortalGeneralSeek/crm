package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// FinancialJuice 各国 CPI / PPI 通胀数据：
//   - 历史值：启动时通过站内新闻搜索 (GetPreviousNews + strSearch) 回补 "XX CPI YoY Actual ..." 发布快讯，
//     结果缓存到本地 JSON，缓存未过期时重启不再请求；
//   - 日程：经济日历 GetCalendar 给出未来一周的发布时间、预期值、前值，低频刷新 (默认 6 小时)；
//   - 实时：新数据发布时 FinancialJuice 会在 WSS 快讯流里推送同格式标题，到达即解析入库并推送前端。
//
// 两个 HTTP 接口都需要首页内嵌的 info 令牌；请求严格串行并留间隔，避免触发 Cloudflare 1015。
const (
	fjHomeURL        = "https://www.financialjuice.com/home"
	fjLiveBase       = "https://live.financialjuice.com/FJService.asmx/"
	fjMacroHistory   = 24
	fjSearchPageSize = 20
)

type fjMacroConfig struct {
	Path            string
	BackfillMaxAge  time.Duration
	CalendarRefresh time.Duration
	RequestGap      time.Duration
}

func loadFJMacroConfig() fjMacroConfig {
	cfg := fjMacroConfig{
		Path:            envOr("FJ_MACRO_PATH", "financialjuice_macro.json"),
		BackfillMaxAge:  12 * time.Hour,
		CalendarRefresh: 6 * time.Hour,
		RequestGap:      4 * time.Second,
	}
	if v, err := strconv.Atoi(os.Getenv("FJ_MACRO_CALENDAR_HOURS")); err == nil && v > 0 {
		cfg.CalendarRefresh = time.Duration(v) * time.Hour
	}
	return cfg
}

// MacroRelease 一次 CPI/PPI 数据发布
type MacroRelease struct {
	NewsID        int64    `json:"newsId,omitempty"`
	Series        string   `json:"series"`
	Title         string   `json:"title"`
	Stage         string   `json:"stage,omitempty"`
	Actual        string   `json:"actual"`
	Forecast      string   `json:"forecast"`
	Previous      string   `json:"previous"`
	Revised       string   `json:"revised,omitempty"`
	ActualValue   *float64 `json:"actualValue,omitempty"`
	ForecastValue *float64 `json:"forecastValue,omitempty"`
	PreviousValue *float64 `json:"previousValue,omitempty"`
	Surprise      *float64 `json:"surprise,omitempty"`
	Beat          string   `json:"beat,omitempty"` // above | below | inline
	ReleasedAt    string   `json:"releasedAt"`
	URL           string   `json:"url,omitempty"`
	Source        string   `json:"source"` // search | stream | calendar
}

// MacroUpcoming 经济日历中尚未发布的 CPI/PPI 事件
type MacroUpcoming struct {
	Series      string `json:"series"`
	Title       string `json:"title"`
	Stage       string `json:"stage,omitempty"`
	Country     string `json:"country"`
	CountryName string `json:"countryName"`
	Label       string `json:"label"`
	ReleaseAt   string `json:"releaseAt"`
	Forecast    string `json:"forecast"`
	Previous    string `json:"previous"`
	Importance  int    `json:"importance"` // 1 高 | 2 中 | 3 低 (FinancialJuice ImpID)
}

type MacroSeries struct {
	Key         string         `json:"key"`
	Country     string         `json:"country"`
	CountryName string         `json:"countryName"`
	Kind        string         `json:"kind"` // CPI | PPI
	Core        bool           `json:"core"`
	Measure     string         `json:"measure,omitempty"`
	Extra       string         `json:"extra,omitempty"` // 限定词，如 Input Prices、Trim、NSA
	Label       string         `json:"label"`
	Headline    bool           `json:"headline"`
	Latest      *MacroRelease  `json:"latest,omitempty"`
	History     []MacroRelease `json:"history"`
	Next        *MacroUpcoming `json:"next,omitempty"`
	// Drivers 实际值高于 / 低于预期时触发的宏观传导剧本 (macroPlaybook 的 key)
	Drivers *MacroOutcomeDrivers `json:"drivers,omitempty"`
}

type MacroOutcomeDrivers struct {
	Above string `json:"above"`
	Below string `json:"below"`
}

// macroOutcomeDrivers 美国通胀直接影响美联储路径；其他经济体的通胀数据主要通过本币强弱影响美元指数，中国数据影响工业品
func macroOutcomeDrivers(country string) *MacroOutcomeDrivers {
	switch country {
	case "US":
		return &MacroOutcomeDrivers{Above: drvUSInflationHot, Below: drvUSInflationCool}
	case "CN":
		return &MacroOutcomeDrivers{Above: drvChinaDataStrong, Below: drvChinaDataWeak}
	case "EU", "DE", "FR", "IT", "ES", "GB", "JP", "CA", "CH", "SE":
		return &MacroOutcomeDrivers{Above: drvNonUSHawkish, Below: drvNonUSDovish}
	}
	return nil
}

type MacroCountry struct {
	Code   string        `json:"code"`
	Name   string        `json:"name"`
	Series []MacroSeries `json:"series"`
}

type MacroStatus struct {
	State          string `json:"state"` // loading | ready | error
	Text           string `json:"text"`
	BackfillAt     string `json:"backfillAt,omitempty"`
	CalendarAt     string `json:"calendarAt,omitempty"`
	LastReleaseAt  string `json:"lastReleaseAt,omitempty"`
	ReleaseCount   int    `json:"releaseCount"`
	SeriesCount    int    `json:"seriesCount"`
	LastError      string `json:"lastError,omitempty"`
	StreamReleases int    `json:"streamReleases"`
}

type MacroSnapshot struct {
	Countries []MacroCountry  `json:"countries"`
	Upcoming  []MacroUpcoming `json:"upcoming"`
	Status    MacroStatus     `json:"status"`
}

type macroSeriesMeta struct {
	key, country, kind, measure, stage, extra string
	core                                      bool
}

type fjCalEvent struct {
	ID          string `json:"ID"`
	Title       string `json:"Title"`
	FJTitle     string `json:"FJTitle"`
	Actual      string `json:"Actual"`
	Forecast    string `json:"Forecast"`
	Previous    string `json:"Previous"`
	Revision    string `json:"Revision"`
	RealDate    string `json:"RealDate"`
	ImpID       string `json:"ImpID"`
	CountryCode string `json:"CountryCode"`
	Active      *bool  `json:"Active"`
}

type macroCache struct {
	SavedAt    time.Time                 `json:"savedAt"`
	BackfillAt time.Time                 `json:"backfillAt"`
	CalendarAt time.Time                 `json:"calendarAt"`
	Releases   map[string][]MacroRelease `json:"releases"`
	Upcoming   []MacroUpcoming           `json:"upcoming"`
}

type FJMacroTracker struct {
	cfg  fjMacroConfig
	mon  *FinancialJuiceMonitor
	http *http.Client

	reqMu  sync.Mutex // HTTP 请求串行化
	lastRq time.Time
	info   string
	infoAt time.Time

	mu             sync.RWMutex
	releases       map[string][]MacroRelease // series → 最新在前
	upcoming       []MacroUpcoming
	backfillAt     time.Time
	calendarAt     time.Time
	state          string
	lastError      string
	streamReleases int
}

func newFJMacroTracker(mon *FinancialJuiceMonitor) *FJMacroTracker {
	return &FJMacroTracker{
		cfg:      loadFJMacroConfig(),
		mon:      mon,
		http:     &http.Client{Timeout: 20 * time.Second},
		releases: make(map[string][]MacroRelease),
		state:    "loading",
	}
}

// run 前须已调用 loadCache
func (t *FJMacroTracker) run() {
	if time.Since(t.backfillAt) > t.cfg.BackfillMaxAge {
		t.backfill()
	} else {
		t.mon.logf("[CPI/PPI] 本地缓存 %s 有效 (回补于 %s)，跳过历史回补", t.cfg.Path, t.backfillAt.In(beijingLoc).Format("01-02 15:04"))
	}
	if time.Since(t.calendarAt) > t.cfg.CalendarRefresh {
		t.refreshCalendar()
	}
	t.setState("ready", "")

	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		t.mu.RLock()
		calDue := time.Since(t.calendarAt) > t.cfg.CalendarRefresh
		backfillFailed := t.backfillAt.IsZero()
		t.mu.RUnlock()
		if backfillFailed {
			t.backfill()
		}
		if calDue {
			t.refreshCalendar()
		}
	}
}

// ---------- 标题解析 ----------

var (
	reMacroHeadline = regexp.MustCompile(`^(.+?)\s+Actual\s+([^()]+?)\s*\((.*)\)\s*$`)
	reMacroKind     = regexp.MustCompile(`\b(CPI|PPI|HICP)\b`)
	reMacroMeasure  = regexp.MustCompile(`\b(YoY|MoM|QoQ)\b`)
	reMacroStage    = regexp.MustCompile(`\s+(Flash|Final|Prelim|Preliminary|Advance)\b`)
	reMacroNumber   = regexp.MustCompile(`-?\d+(?:\.\d+)?`)
)

// 前缀按长度降序匹配，保证 "New Zealand" 先于 "NZ"、"South Korean" 先于 "S."
var macroCountryPrefixes = []struct{ prefix, code string }{
	{"South African", "ZA"}, {"South Korean", "KR"}, {"S. Korean", "KR"}, {"New Zealand", "NZ"},
	{"Hong Kong", "HK"}, {"Eurozone", "EU"}, {"Euro Zone", "EU"}, {"Japanese", "JP"}, {"Tokyo", "JP"},
	{"Canadian", "CA"}, {"Australian", "AU"}, {"Australia", "AU"}, {"Chinese", "CN"}, {"China", "CN"},
	{"German", "DE"}, {"French", "FR"}, {"Italian", "IT"}, {"Spanish", "ES"}, {"Swiss", "CH"},
	{"Swedish", "SE"}, {"Norwegian", "NO"}, {"Danish", "DK"}, {"Dutch", "NL"}, {"Irish", "IE"},
	{"Austrian", "AT"}, {"Belgian", "BE"}, {"Portuguese", "PT"}, {"Greek", "GR"}, {"Polish", "PL"},
	{"Czech", "CZ"}, {"Hungarian", "HU"}, {"Turkish", "TR"}, {"Russian", "RU"}, {"Indian", "IN"},
	{"Indonesian", "ID"}, {"Singapore", "SG"}, {"Taiwanese", "TW"}, {"Taiwan", "TW"}, {"Thai", "TH"},
	{"Philippine", "PH"}, {"Malaysian", "MY"}, {"Brazilian", "BR"}, {"Mexican", "MX"}, {"Chilean", "CL"},
	{"Colombian", "CO"}, {"Argentine", "AR"}, {"Israeli", "IL"}, {"Saudi", "SA"}, {"Korean", "KR"},
	{"BoC", "CA"}, {"UK", "GB"}, {"US", "US"}, {"EZ", "EU"}, {"NZ", "NZ"},
}

var macroCountryNames = map[string]string{
	"US": "美国", "CN": "中国", "EU": "欧元区", "DE": "德国", "GB": "英国", "JP": "日本", "FR": "法国",
	"IT": "意大利", "ES": "西班牙", "CA": "加拿大", "AU": "澳大利亚", "NZ": "新西兰", "CH": "瑞士",
	"SE": "瑞典", "NO": "挪威", "DK": "丹麦", "NL": "荷兰", "IE": "爱尔兰", "AT": "奥地利", "BE": "比利时",
	"PT": "葡萄牙", "GR": "希腊", "PL": "波兰", "CZ": "捷克", "HU": "匈牙利", "TR": "土耳其", "RU": "俄罗斯",
	"IN": "印度", "ID": "印度尼西亚", "SG": "新加坡", "TW": "中国台湾", "HK": "中国香港", "TH": "泰国",
	"PH": "菲律宾", "MY": "马来西亚", "BR": "巴西", "MX": "墨西哥", "CL": "智利", "CO": "哥伦比亚",
	"AR": "阿根廷", "IL": "以色列", "SA": "沙特", "ZA": "南非", "KR": "韩国",
}

var macroCountryOrder = []string{"US", "CN", "EU", "DE", "GB", "JP", "FR", "IT", "ES", "CA", "AU", "NZ", "CH", "KR", "IN", "SE", "NO"}

func macroCountryOf(name string) (code, prefix, rest string) {
	for _, p := range macroCountryPrefixes {
		if strings.HasPrefix(name, p.prefix+" ") {
			return p.code, p.prefix, strings.TrimSpace(name[len(p.prefix):])
		}
	}
	return "", "", name
}

// parseMacroSeries 识别 "US Core PPI YoY" / "Eurozone CPI YoY Final" 一类指标名
func parseMacroSeries(name string) (macroSeriesMeta, bool) {
	name = strings.Join(strings.Fields(name), " ")
	m := macroSeriesMeta{}
	kind := reMacroKind.FindString(name)
	if kind == "" {
		return m, false
	}
	code, prefix, rest := macroCountryOf(name)
	if code == "" {
		return m, false
	}
	if sm := reMacroStage.FindStringSubmatch(rest); sm != nil {
		m.stage = sm[1]
		if m.stage == "Preliminary" {
			m.stage = "Prelim"
		}
		rest = strings.TrimSpace(reMacroStage.ReplaceAllString(rest, ""))
	}
	m.country = code
	m.kind = kind
	if kind == "HICP" {
		m.kind = "CPI"
	}
	m.measure = reMacroMeasure.FindString(rest)
	m.core = strings.Contains(rest, "Core")
	extra := rest
	for _, w := range []string{"Core", kind, m.measure} {
		if w != "" {
			extra = strings.Replace(extra, w, "", 1)
		}
	}
	m.extra = strings.Join(strings.Fields(extra), " ")
	m.key = prefix + " " + rest
	return m, true
}

func macroLabel(meta macroSeriesMeta) string {
	var b strings.Builder
	if meta.core {
		b.WriteString("核心 ")
	}
	if strings.Contains(meta.key, "HICP") {
		b.WriteString("HICP")
	} else {
		b.WriteString(meta.kind)
	}
	switch meta.measure {
	case "YoY":
		b.WriteString(" 同比")
	case "MoM":
		b.WriteString(" 环比")
	case "QoQ":
		b.WriteString(" 季环比")
	}
	if meta.extra != "" {
		b.WriteString(" · " + meta.extra)
	}
	return b.String()
}

// 每个国家用于概览的主序列：非核心、无附加限定 (如 Trim/Median/NSA)，同比优先
func isHeadlineSeries(meta macroSeriesMeta) bool {
	return !meta.core && meta.extra == "" && meta.measure == "YoY"
}

func parseMacroNumber(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "-" {
		return nil
	}
	n := reMacroNumber.FindString(strings.ReplaceAll(s, ",", ""))
	if n == "" {
		return nil
	}
	v, err := strconv.ParseFloat(n, 64)
	if err != nil {
		return nil
	}
	return &v
}

func cleanMacroValue(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "-"
	}
	return s
}

// parseMacroHeadline 解析 "US CPI YoY Actual 3.7% (Forecast 3.6%, Previous 3.4%, Revised 3.5%)"
func parseMacroHeadline(title string) (MacroRelease, macroSeriesMeta, bool) {
	sm := reMacroHeadline.FindStringSubmatch(strings.TrimSpace(title))
	if sm == nil {
		return MacroRelease{}, macroSeriesMeta{}, false
	}
	meta, ok := parseMacroSeries(sm[1])
	if !ok {
		return MacroRelease{}, macroSeriesMeta{}, false
	}
	r := MacroRelease{Series: meta.key, Title: strings.TrimSpace(title), Stage: meta.stage, Actual: cleanMacroValue(sm[2]), Forecast: "-", Previous: "-"}
	for _, part := range strings.Split(sm[3], ",") {
		part = strings.TrimSpace(part)
		k, v, _ := strings.Cut(part, " ")
		switch k {
		case "Forecast":
			r.Forecast = cleanMacroValue(v)
		case "Previous":
			r.Previous = cleanMacroValue(v)
		case "Revised", "Revision":
			r.Revised = cleanMacroValue(v)
		}
	}
	fillMacroValues(&r)
	return r, meta, true
}

func fillMacroValues(r *MacroRelease) {
	r.ActualValue = parseMacroNumber(r.Actual)
	r.ForecastValue = parseMacroNumber(r.Forecast)
	r.PreviousValue = parseMacroNumber(r.Previous)
	r.Surprise, r.Beat = nil, ""
	if r.ActualValue != nil && r.ForecastValue != nil {
		d := roundTo(*r.ActualValue-*r.ForecastValue, 4)
		r.Surprise = &d
		switch {
		case d > 0.00001:
			r.Beat = "above"
		case d < -0.00001:
			r.Beat = "below"
		default:
			r.Beat = "inline"
		}
	}
}

func roundTo(v float64, places int) float64 {
	p, _ := strconv.ParseFloat(strconv.FormatFloat(v, 'f', places, 64), 64)
	return p
}

// ---------- 入库 ----------

func releaseDay(r MacroRelease) string {
	if t, err := time.Parse(time.RFC3339, r.ReleasedAt); err == nil {
		return t.UTC().Format("2006-01-02")
	}
	return ""
}

// upsertLocked 同一序列同一天同一阶段视为同一次发布；快讯来源优先于日历来源 (有 NewsID 与链接)
func (t *FJMacroTracker) upsertLocked(r MacroRelease) bool {
	list := t.releases[r.Series]
	day := releaseDay(r)
	for i, old := range list {
		if (r.NewsID > 0 && old.NewsID == r.NewsID) || (releaseDay(old) == day && old.Stage == r.Stage) {
			if old.Source == "calendar" && r.Source != "calendar" {
				list[i] = r
				return true
			}
			return false
		}
	}
	list = append(list, r)
	sort.SliceStable(list, func(i, j int) bool { return list[i].ReleasedAt > list[j].ReleasedAt })
	if len(list) > fjMacroHistory {
		list = list[:fjMacroHistory]
	}
	t.releases[r.Series] = list
	return true
}

func (t *FJMacroTracker) ingestNewsLocked(raw fjRawNews, source string) (MacroRelease, macroSeriesMeta, bool) {
	r, meta, ok := parseMacroHeadline(raw.Title)
	if !ok {
		return r, meta, false
	}
	published := parseFJTime(raw.DatePublished)
	if published.IsZero() {
		published = time.Now()
	}
	r.NewsID = raw.NewsID
	r.ReleasedAt = published.In(beijingLoc).Format(time.RFC3339)
	r.URL = fjNewsURL(raw.NewsID, raw.Title)
	r.Source = source
	if !t.upsertLocked(r) {
		return r, meta, false
	}
	return r, meta, true
}

// OnNews 由快讯流在每条新快讯到达时调用
func (t *FJMacroTracker) OnNews(raw fjRawNews) {
	t.mu.Lock()
	r, meta, added := t.ingestNewsLocked(raw, "stream")
	if added {
		t.streamReleases++
		t.dropUpcomingLocked(meta.key, r.ReleasedAt)
	}
	t.mu.Unlock()
	if !added {
		return
	}
	t.saveCache()
	t.mon.logf("[CPI/PPI] 实时发布 %s %s: 实际 %s | 预期 %s | 前值 %s", macroCountryNames[meta.country], meta.key, r.Actual, r.Forecast, r.Previous)
	series := t.seriesSnapshot(meta.key)
	if b, err := json.Marshal(map[string]interface{}{"type": "macro_release", "release": r, "series": series}); err == nil {
		t.mon.hub.Broadcast(b)
	}
}

// AddBaseline 补录 RSS 基准中的数据发布快讯 (覆盖服务停机期间的发布)，不推送前端
func (t *FJMacroTracker) AddBaseline(items []NewsItem) {
	added := 0
	t.mu.Lock()
	for _, it := range items {
		raw := fjRawNews{NewsID: it.ID, Title: it.Title, DatePublished: strings.TrimSuffix(it.PublishedAt, "Z")}
		if r, meta, ok := t.ingestNewsLocked(raw, "stream"); ok {
			t.dropUpcomingLocked(meta.key, r.ReleasedAt)
			added++
		}
	}
	t.mu.Unlock()
	if added > 0 {
		t.saveCache()
		t.mon.logf("[CPI/PPI] RSS 基准中补录 %d 条数据发布", added)
	}
}

// dropUpcomingLocked 发布后移除对应的日程 (日历事件时间与快讯时间可能相差数分钟)
func (t *FJMacroTracker) dropUpcomingLocked(series, releasedAt string) {
	rel, err := time.Parse(time.RFC3339, releasedAt)
	if err != nil {
		return
	}
	out := t.upcoming[:0]
	for _, u := range t.upcoming {
		at, err := time.Parse(time.RFC3339, u.ReleaseAt)
		if u.Series == series && err == nil && at.Before(rel.Add(2*time.Hour)) {
			continue
		}
		out = append(out, u)
	}
	t.upcoming = out
}

// ---------- FinancialJuice HTTP ----------

var reFJInfo = regexp.MustCompile(`var info\s*=\s*'([^']+)'`)

func (t *FJMacroTracker) throttle() {
	if wait := t.cfg.RequestGap - time.Since(t.lastRq); wait > 0 {
		time.Sleep(wait)
	}
	t.lastRq = time.Now()
}

func (t *FJMacroTracker) get(rawURL, referer string, limit int64) ([]byte, error) {
	t.throttle()
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", fjUserAgent)
	req.Header.Set("Referer", referer)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := t.http.Do(req)
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

// infoToken 首页内嵌的匿名会话令牌，GetCalendar / GetPreviousNews 均需携带
func (t *FJMacroTracker) infoToken(force bool) (string, error) {
	if !force && t.info != "" && time.Since(t.infoAt) < time.Hour {
		return t.info, nil
	}
	body, err := t.get(fjHomeURL, fjOrigin+"/", 4<<20)
	if err != nil {
		return "", fmt.Errorf("获取首页令牌失败: %w", err)
	}
	sm := reFJInfo.FindSubmatch(body)
	if sm == nil {
		return "", errors.New("首页未找到 info 令牌")
	}
	t.info, t.infoAt = string(sm[1]), time.Now()
	return t.info, nil
}

func (t *FJMacroTracker) callService(method string, params url.Values) ([]byte, error) {
	for attempt := 0; attempt < 2; attempt++ {
		info, err := t.infoToken(attempt > 0)
		if err != nil {
			return nil, err
		}
		q := url.Values{}
		for k, v := range params {
			q[k] = v
		}
		infoJSON, _ := json.Marshal(info)
		q.Set("info", string(infoJSON))
		q.Set("TimeOffset", "0")
		body, err := t.get(fjLiveBase+method+"?"+q.Encode(), fjHomeURL, 8<<20)
		if err != nil {
			return nil, err
		}
		var env struct {
			D json.RawMessage `json:"d"`
		}
		if json.Unmarshal(body, &env) != nil {
			return nil, fmt.Errorf("%s 返回非 JSON 响应", method)
		}
		var inner string
		if json.Unmarshal(env.D, &inner) == nil {
			if inner != "" {
				return []byte(inner), nil
			}
		} else if len(env.D) > 0 && string(env.D) != "null" {
			return env.D, nil
		}
		// d 为空多半是令牌过期，刷新令牌后重试一次
	}
	return nil, fmt.Errorf("%s 返回空数据", method)
}

func (t *FJMacroTracker) searchNews(term string, oldID int64) ([]fjRawNews, error) {
	term2, _ := json.Marshal(term)
	body, err := t.callService("GetPreviousNews", url.Values{
		"tabID": {"0"}, "oldID": {strconv.FormatInt(oldID, 10)}, "TickerID": {"0"},
		"FeedCompanyID": {"0"}, "strSearch": {string(term2)}, "extraNID": {"0"},
	})
	if err != nil {
		return nil, err
	}
	return parseFJItems(body), nil
}

// 站内搜索按连续短语匹配。美国 8 个序列单独检索 (各约 20 个月)；主要经济体按 "国家 CPI/PPI"
// 检索 (一页覆盖该国各口径近几个月)；其余国家靠通用短语兜底。
var macroBackfillQueries = []struct {
	term  string
	pages int
}{
	{"US CPI YoY Actual", 1}, {"US Core CPI YoY Actual", 1}, {"US CPI MoM Actual", 1}, {"US Core CPI MoM Actual", 1},
	{"US PPI YoY Actual", 1}, {"US Core PPI YoY Actual", 1}, {"US PPI MoM Actual", 1}, {"US Core PPI MoM Actual", 1},
	{"Chinese CPI", 1}, {"Eurozone CPI", 1}, {"German CPI", 1}, {"UK CPI", 1}, {"Japanese CPI", 1},
	{"French CPI", 1}, {"Italian CPI", 1}, {"Spanish CPI", 1}, {"Canadian CPI", 1}, {"Australian CPI", 1},
	{"New Zealand CPI", 1}, {"Swiss CPI", 1}, {"Indian CPI", 1}, {"S. Korean CPI", 1},
	{"Chinese PPI", 1}, {"Eurozone PPI", 1}, {"German PPI", 1}, {"UK PPI", 1}, {"Japanese PPI", 1}, {"Canadian PPI", 1},
	{"CPI YoY Actual", 1}, {"Core CPI YoY Actual", 1}, {"PPI YoY Actual", 2},
}

func (t *FJMacroTracker) backfill() {
	t.reqMu.Lock()
	defer t.reqMu.Unlock()
	t.mon.logf("[CPI/PPI] 开始通过 FinancialJuice 站内搜索回补各国 CPI/PPI 历史发布数据 (%d 组检索)", len(macroBackfillQueries))
	added, requests := 0, 0
	var lastErr error
	for _, q := range macroBackfillQueries {
		var oldID int64
		for page := 0; page < q.pages; page++ {
			items, err := t.searchNews(q.term, oldID)
			requests++
			if err != nil {
				lastErr = err
				t.mon.logf("[CPI/PPI] 检索 %q 失败: %v", q.term, err)
				if errors.Is(err, errFJRateLimited) {
					t.setState("error", "FinancialJuice 限流，历史回补中止，10 分钟后重试")
					return
				}
				break
			}
			t.mu.Lock()
			for _, it := range items {
				if _, _, ok := t.ingestNewsLocked(it, "search"); ok {
					added++
				}
				if oldID == 0 || it.NewsID < oldID {
					oldID = it.NewsID
				}
			}
			t.mu.Unlock()
			if len(items) < fjSearchPageSize {
				break
			}
		}
	}
	if added == 0 && lastErr != nil {
		t.setState("error", "历史回补失败: "+lastErr.Error())
		return
	}
	t.mu.Lock()
	t.backfillAt = time.Now()
	t.mu.Unlock()
	t.saveCache()
	t.mon.logf("[CPI/PPI] 历史回补完成: %d 次请求，新增 %d 条发布记录，覆盖 %d 个序列", requests, added, t.seriesCount())
}

func (t *FJMacroTracker) refreshCalendar() {
	t.reqMu.Lock()
	defer t.reqMu.Unlock()
	body, err := t.callService("GetCalendar", url.Values{})
	if err != nil {
		t.mon.logf("[CPI/PPI] 经济日历拉取失败: %v", err)
		t.setState(t.currentState(), "经济日历拉取失败: "+err.Error())
		return
	}
	var events []fjCalEvent
	if err := json.Unmarshal(body, &events); err != nil {
		t.mon.logf("[CPI/PPI] 经济日历解析失败: %v", err)
		return
	}
	released, upcoming := t.applyCalendar(events, true)
	t.mon.logf("[CPI/PPI] 经济日历刷新: 共 %d 个事件，CPI/PPI 待发布 %d 项，日历补录已发布 %d 项", len(events), upcoming, released)
}

// applyCalendar replaceUpcoming=true 表示这是完整日历 (整体替换待发布列表)，否则是 WSS 增量更新
func (t *FJMacroTracker) applyCalendar(events []fjCalEvent, replaceUpcoming bool) (released, upcoming int) {
	now := time.Now()
	var next []MacroUpcoming
	t.mu.Lock()
	for _, e := range events {
		title := strings.TrimSpace(e.Title)
		meta, ok := parseMacroSeries(title)
		if !ok || (e.Active != nil && !*e.Active) {
			continue
		}
		at, err := time.ParseInLocation("2006-01-02T15:04:05", strings.TrimSpace(e.RealDate), time.UTC)
		if err != nil {
			continue
		}
		actual := cleanMacroValue(e.Actual)
		if actual != "-" && !at.After(now.Add(5*time.Minute)) {
			r := MacroRelease{
				Series: meta.key, Title: title, Stage: meta.stage, Actual: actual,
				Forecast: cleanMacroValue(e.Forecast), Previous: cleanMacroValue(e.Previous), Revised: strings.TrimSpace(e.Revision),
				ReleasedAt: at.In(beijingLoc).Format(time.RFC3339), Source: "calendar",
			}
			fillMacroValues(&r)
			if t.upsertLocked(r) {
				released++
			}
			if !replaceUpcoming {
				t.dropUpcomingLocked(meta.key, r.ReleasedAt)
			}
			continue
		}
		if at.Before(now.Add(-time.Hour)) {
			continue
		}
		imp, _ := strconv.Atoi(e.ImpID)
		u := MacroUpcoming{
			Series: meta.key, Title: title, Stage: meta.stage, Country: meta.country,
			CountryName: macroCountryNames[meta.country], Label: macroLabel(meta),
			ReleaseAt: at.In(beijingLoc).Format(time.RFC3339),
			Forecast:  cleanMacroValue(e.Forecast), Previous: cleanMacroValue(e.Previous), Importance: imp,
		}
		next = append(next, u)
	}
	if replaceUpcoming {
		t.upcoming = next
		t.calendarAt = now
	} else {
		for _, u := range next {
			replaced := false
			for i := range t.upcoming {
				if t.upcoming[i].Series == u.Series && t.upcoming[i].Stage == u.Stage {
					t.upcoming[i], replaced = u, true
				}
			}
			if !replaced {
				t.upcoming = append(t.upcoming, u)
			}
		}
	}
	sort.SliceStable(t.upcoming, func(i, j int) bool { return t.upcoming[i].ReleaseAt < t.upcoming[j].ReleaseAt })
	upcoming = len(t.upcoming)
	t.mu.Unlock()
	if released > 0 || replaceUpcoming || len(next) > 0 {
		t.saveCache()
	}
	return released, upcoming
}

// OnCalendarEvent WSS 推送的日历增量 (sendCalendarUpdates / sendCalendarUpdateEvents)
func (t *FJMacroTracker) OnCalendarEvent(payload []byte) bool {
	var events []fjCalEvent
	if json.Unmarshal(payload, &events) != nil {
		var one fjCalEvent
		if json.Unmarshal(payload, &one) != nil || one.Title == "" {
			return false
		}
		events = []fjCalEvent{one}
	}
	valid := events[:0]
	for _, e := range events {
		if strings.TrimSpace(e.Title) != "" && e.RealDate != "" {
			valid = append(valid, e)
		}
	}
	if len(valid) == 0 {
		return false
	}
	released, _ := t.applyCalendar(valid, false)
	if released > 0 {
		if b, err := json.Marshal(map[string]interface{}{"type": "macro_refresh"}); err == nil {
			t.mon.hub.Broadcast(b)
		}
	}
	return true
}

// ---------- 快照 ----------

func (t *FJMacroTracker) setState(state, errText string) {
	t.mu.Lock()
	t.state = state
	t.lastError = errText
	t.mu.Unlock()
}

func (t *FJMacroTracker) currentState() string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.state
}

func (t *FJMacroTracker) seriesCount() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.releases)
}

func (t *FJMacroTracker) buildSeriesLocked(key string, historyLimit int) (MacroSeries, bool) {
	list := t.releases[key]
	meta, ok := parseMacroSeries(key)
	if !ok {
		return MacroSeries{}, false
	}
	s := MacroSeries{
		Key: key, Country: meta.country, CountryName: macroCountryNames[meta.country], Kind: meta.kind,
		Core: meta.core, Measure: meta.measure, Extra: meta.extra, Label: macroLabel(meta), Headline: isHeadlineSeries(meta),
		History: []MacroRelease{},
		Drivers: macroOutcomeDrivers(meta.country),
	}
	if len(list) > 0 {
		latest := list[0]
		s.Latest = &latest
		n := len(list)
		if historyLimit > 0 && n > historyLimit {
			n = historyLimit
		}
		s.History = append(s.History, list[:n]...)
	}
	for _, u := range t.upcoming {
		if u.Series == key {
			next := u
			s.Next = &next
			break
		}
	}
	return s, true
}

func (t *FJMacroTracker) seriesSnapshot(key string) *MacroSeries {
	t.mu.RLock()
	defer t.mu.RUnlock()
	s, ok := t.buildSeriesLocked(key, fjMacroHistory)
	if !ok {
		return nil
	}
	return &s
}

func countryRank(code string) int {
	for i, c := range macroCountryOrder {
		if c == code {
			return i
		}
	}
	return len(macroCountryOrder)
}

func seriesRank(s MacroSeries) int {
	r := 0
	if s.Kind == "PPI" {
		r += 100
	}
	if s.Extra != "" {
		r += 50
	}
	if s.Core {
		r += 10
	}
	switch s.Measure {
	case "MoM":
		r += 1
	case "QoQ":
		r += 2
	case "":
		r += 3
	}
	return r
}

func (t *FJMacroTracker) Snapshot() MacroSnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()
	byCountry := map[string][]MacroSeries{}
	var lastRelease string
	total := 0
	keys := map[string]bool{}
	for k := range t.releases {
		keys[k] = true
	}
	for _, u := range t.upcoming {
		keys[u.Series] = true
	}
	for key := range keys {
		s, ok := t.buildSeriesLocked(key, fjMacroHistory)
		if !ok {
			continue
		}
		byCountry[s.Country] = append(byCountry[s.Country], s)
		total += len(t.releases[key])
		if s.Latest != nil && s.Latest.ReleasedAt > lastRelease {
			lastRelease = s.Latest.ReleasedAt
		}
	}
	countries := make([]MacroCountry, 0, len(byCountry))
	for code, list := range byCountry {
		sort.SliceStable(list, func(i, j int) bool {
			ri, rj := seriesRank(list[i]), seriesRank(list[j])
			if ri != rj {
				return ri < rj
			}
			return list[i].Key < list[j].Key
		})
		countries = append(countries, MacroCountry{Code: code, Name: macroCountryNames[code], Series: list})
	}
	sort.SliceStable(countries, func(i, j int) bool {
		ri, rj := countryRank(countries[i].Code), countryRank(countries[j].Code)
		if ri != rj {
			return ri < rj
		}
		return countries[i].Code < countries[j].Code
	})
	upcoming := append([]MacroUpcoming{}, t.upcoming...)
	st := MacroStatus{
		State: t.state, ReleaseCount: total, SeriesCount: len(keys), LastError: t.lastError,
		LastReleaseAt: lastRelease, StreamReleases: t.streamReleases,
	}
	if !t.backfillAt.IsZero() {
		st.BackfillAt = t.backfillAt.In(beijingLoc).Format(time.RFC3339)
	}
	if !t.calendarAt.IsZero() {
		st.CalendarAt = t.calendarAt.In(beijingLoc).Format(time.RFC3339)
	}
	switch t.state {
	case "loading":
		st.Text = "正在从 FinancialJuice 回补各国 CPI/PPI 历史数据"
	case "error":
		st.Text = "数据回补异常，已展示缓存数据"
	default:
		st.Text = "实时监听中：新数据发布随快讯流即时推送"
	}
	return MacroSnapshot{Countries: countries, Upcoming: upcoming, Status: st}
}

// PromptSummary 供 AI 研判使用的通胀数据摘要 (美国全部序列 + 其他国家主序列)
func (t *FJMacroTracker) PromptSummary() string {
	snap := t.Snapshot()
	var lines []string
	for _, c := range snap.Countries {
		for _, s := range c.Series {
			if s.Latest == nil || (c.Code != "US" && !s.Headline) || s.Extra != "" {
				continue
			}
			r := s.Latest
			when := r.ReleasedAt
			if tm, err := time.Parse(time.RFC3339, when); err == nil {
				when = tm.In(beijingLoc).Format("2006-01-02")
			}
			beat := map[string]string{"above": "高于预期", "below": "低于预期", "inline": "符合预期"}[r.Beat]
			line := fmt.Sprintf("- %s %s：实际 %s，预期 %s，前值 %s", c.Name, s.Label, r.Actual, r.Forecast, r.Previous)
			if beat != "" {
				line += "（" + beat + "）"
			}
			line += "，发布于 " + when
			lines = append(lines, line)
		}
	}
	for i, u := range snap.Upcoming {
		if i >= 8 {
			break
		}
		at := u.ReleaseAt
		if tm, err := time.Parse(time.RFC3339, at); err == nil {
			at = tm.Format("01-02 15:04")
		}
		lines = append(lines, fmt.Sprintf("- [待发布 北京时间 %s] %s %s：预期 %s，前值 %s", at, u.CountryName, u.Label, u.Forecast, u.Previous))
	}
	if len(lines) == 0 {
		return "（CPI/PPI 数据尚未加载）"
	}
	return strings.Join(lines, "\n")
}

// ---------- 缓存 ----------

func (t *FJMacroTracker) loadCache() {
	b, err := os.ReadFile(t.cfg.Path)
	if err != nil {
		return
	}
	var c macroCache
	if err := json.Unmarshal(b, &c); err != nil {
		t.mon.logf("[CPI/PPI] 缓存 %s 解析失败，将重新回补: %v", t.cfg.Path, err)
		return
	}
	t.mu.Lock()
	for k, v := range c.Releases {
		if _, ok := parseMacroSeries(k); ok {
			t.releases[k] = v
		}
	}
	t.upcoming = c.Upcoming
	t.backfillAt, t.calendarAt = c.BackfillAt, c.CalendarAt
	n := len(t.releases)
	t.mu.Unlock()
	t.mon.logf("[CPI/PPI] 已从缓存恢复 %d 个序列", n)
}

func (t *FJMacroTracker) saveCache() {
	t.mu.RLock()
	c := macroCache{SavedAt: time.Now(), BackfillAt: t.backfillAt, CalendarAt: t.calendarAt, Releases: t.releases, Upcoming: t.upcoming}
	b, err := json.Marshal(c)
	t.mu.RUnlock()
	if err != nil {
		return
	}
	tmp := t.cfg.Path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err == nil {
		_ = os.Rename(tmp, t.cfg.Path)
	}
}
