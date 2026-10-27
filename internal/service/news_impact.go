package service

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// AssetImpact 单条快讯对某一监控标的的方向性影响
type AssetImpact struct {
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Direction string `json:"direction"` // bullish (看涨/上行) | bearish (看跌/下行)
	Label     string `json:"label"`     // 利好 / 利空 / 收益率上行 / 波动加剧 ...
	Score     int    `json:"score"`
	Reason    string `json:"reason"`
}

// newsAnalysis 规则引擎对一条英文快讯标题的研判结果
type newsAnalysis struct {
	Category    string
	IsUS        bool
	Impacts     []AssetImpact
	Drivers     []NewsDriver
	Impact      string
	Summary     string
	ImpactLevel string
}

const (
	symGold   = "TVC:GOLD"
	symSilver = "TVC:SILVER"
	symWTI    = "TVC:USOIL"
	symBrent  = "TVC:UKOIL"
	symCopper = "COMEX:HG1!"
	symDXY    = "TVC:DXY"
	symUS10Y  = "TVC:US10Y"
	symCNH    = "FX_IDC:USDCNH"
	symVIX    = "TVC:VIX"
	symSPX    = "TVC:SPX"
	symBTC    = "BINANCE:BTCUSDT"
)

var impactAssetOrder = []string{symGold, symSilver, symWTI, symBrent, symCopper, symDXY, symUS10Y, symCNH, symVIX, symSPX, symBTC}

var impactAssetNames = map[string]string{
	symGold:   "黄金",
	symSilver: "白银",
	symWTI:    "WTI原油",
	symBrent:  "布伦特原油",
	symCopper: "铜",
	symDXY:    "美元指数",
	symUS10Y:  "美债10Y收益率",
	symCNH:    "美元/离岸人民币",
	symVIX:    "VIX恐慌指数",
	symSPX:    "标普500",
	symBTC:    "比特币",
}

// impactLabel 收益率、波动率与汇率对"利好/利空"的语义有歧义，改用涨跌方向表述
func impactLabel(symbol string, bullish bool) string {
	switch symbol {
	case symUS10Y:
		if bullish {
			return "收益率上行"
		}
		return "收益率下行"
	case symVIX:
		if bullish {
			return "波动加剧"
		}
		return "波动回落"
	case symCNH:
		if bullish {
			return "人民币承压"
		}
		return "人民币走强"
	}
	if bullish {
		return "利好"
	}
	return "利空"
}

var (
	reUSContext  = regexp.MustCompile(`\bUS\b|\bU\.S\.|\bUSA\b|United States|America|\bFed\b|Fed's|FOMC|Powell|Treasur|White House|Trump|Congress|Senate|Pentagon|Wall Street|Nonfarm|Non-Farm|\bNFP\b|\bEIA\b|\bISM\b|\bADP\b|\bS&P\b|Nasdaq|\bDow\b|Bessent|Washington|\bSEC\b|\bCFTC\b|Lutnick|Greer|Vance|Rubio|Hegseth|Warsh|Hassett|\bJOLTS\b|Michigan`)
	reFedSpeaker = regexp.MustCompile(`(?i)\b(fed|fomc|powell|waller|williams|bowman|jefferson|barr|cook|goolsbee|kashkari|logan|daly|bostic|hammack|musalem|schmid|harker|barkin|kugler|miran|warsh|hassett|paulson)\b`)
	reOtherCB    = regexp.MustCompile(`(?i)\b(ecb|lagarde|boe|bailey|boj|ueda|rba|boc|snb|rbnz|bundesbank)\b`)
	rePBOC       = regexp.MustCompile(`(?i)\b(pboc|people's bank of china|china central bank)\b`)

	reHawkNeg   = regexp.MustCompile(`(?i)no rush to (cut|ease)|not in a hurry|premature to (cut|ease)|too early to (cut|ease)|against (a |further )?(rate )?cut|no (more )?cuts|cuts? (are |is )?(off the table|unlikely)`)
	reHawk      = regexp.MustCompile(`(?i)rate hikes?|raise rates|raising rates|hike rates|hiking|hawkish|higher for longer|tighten|inflation\b.{0,30}\b(remains?|is|still|stays?)\b.{0,15}\b(high|elevated|sticky|stubborn|persistent)|stubborn|upside risks?|above-target inflation|unacceptable|overheat|discouraging|not (been )?transitory|need to address|no urgency|hold rates|holds rates|keep rates (on hold|unchanged|steady)|leaves rates unchanged`)
	reDove      = regexp.MustCompile(`(?i)rate cuts? (is |are )?(appropriate|warranted|likely)|(support|favou?r)s? (a )?(rate )?cuts?|cut rates|cutting rates|cuts rates|lower rates|lowering rates|dovish|further cuts|more cuts|labou?r market (is |has )?(weak|cool|soft|deteriorat)|downside risks? to (employment|the labou?r)|inflation (is |will )?(cool|eas|moderat)`)
	reNonUSHike = regexp.MustCompile(`(?i)rate hikes?|raise rates|raising rates|hikes rates|hawkish|tighten|not be too cautious|inflation\b.{0,40}\b(taking (a )?(stronger )?hold|widens|spreading)|upside risks? to prices|normali[sz]ation`)
	reNonUSCut  = regexp.MustCompile(`(?i)rate cuts?|cut rates|cuts rates|lower rates|easing|dovish`)

	reGeoEscalate    = regexp.MustCompile(`(?i)\battack|missile|\bdrones?\b|air ?strikes?|\bstrikes? (on|against)|explosion|invasion|invade|\bwar\b|military|troops|shelling|bombing|killed|nuclear|escalat|retaliat|hostilit|sanction|blockade|seiz|hijack|intercept|warship|naval|mobiliz|coup|terror`)
	reGeoCalm        = regexp.MustCompile(`(?i)ceasefire|cease-fire|truce|peace (deal|talks|agreement|plan|accord)|de-?escalat|hostage (deal|release)|withdraw(s|al)? (troops|forces)|(eas(e|es|ed|ing)|lift(s|ed|ing)?|relax(es|ed|ing)?|unfreez(e|es|ing))\s+(\w+\s+){0,3}(sanctions|assets)`)
	reCalmNegated    = regexp.MustCompile(`(?i)\breject|collaps|stall|breaks? down|broke down|\bfail(s|ed)?\b|walk(s|ed)? out|suspend|violat|no progress|deadlock`)
	reSanctionRelief = regexp.MustCompile(`(?i)(eas(e|es|ed|ing)|lift(s|ed|ing)?|relax(es|ed|ing)?)\s+(\w+\s+){0,3}sanctions`)
	reMiddleEast     = regexp.MustCompile(`(?i)iran|israel|gaza|hezbollah|houthi|yemen|saudi|hormuz|red sea|lebanon|syria|iraq|qatar|\buae\b|oman|middle east|persian gulf|gulf of|kuwait|libya`)
	reRussia         = regexp.MustCompile(`(?i)russia|ukrain|kremlin|putin|zelensk|black sea|crimea`)
	reAsiaTension    = regexp.MustCompile(`(?i)taiwan|south china sea|\bpla\b|north korea|pyongyang`)

	reTradeDeal  = regexp.MustCompile(`(?i)trade (deal|agreement|truce|pact)|tariffs? (cut|reduction|pause|exemption|relief|delay)|(lift|remove|suspend|scrap|lower|reduce|roll back)(s|ed|ing)? (the )?tariffs?`)
	reTradeWar   = regexp.MustCompile(`(?i)tariff|trade war|export controls?|import ban|retaliatory|anti-dumping|entity list`)
	reChina      = regexp.MustCompile(`(?i)\bchina\b|chinese|beijing|\byuan\b|pboc|xi jinping`)
	reChinaBoost = regexp.MustCompile(`(?i)(stimulus|support measures|rrr cut|cut(s|ting)? (the )?(rrr|reserve requirement|lpr|loan prime rate|interest rates?)|special bonds?|property support|fiscal support)`)

	reOilOutput = regexp.MustCompile(`(?i)opec|oil output|oil production|crude output|crude production|barrels per day|\bbpd\b|oil supply`)
	reOutputCut = regexp.MustCompile(`(?i)\bcut|reduc|curb|lower output|halt|disrupt|outage|shut`)
	reOutputUp  = regexp.MustCompile(`(?i)increase|boost|raise|ramp up|hike output|add(s|ing)? .*barrels|unwind|restore`)
	reOilAsset  = regexp.MustCompile(`(?i)refiner|pipeline|oil (field|facility|tanker|terminal|port)|tanker|aramco|abqaiq`)

	reCrypto    = regexp.MustCompile(`(?i)bitcoin|\bbtc\b|crypto|ether(eum)?\b|stablecoin`)
	reCryptoPos = regexp.MustCompile(`(?i)etf inflows?|approv|record high|all-time high|strategic reserve|adopt|rall|surge|jump|soar|legaliz`)
	reCryptoNeg = regexp.MustCompile(`(?i)hack|\bban\b|crackdown|lawsuit|\bsues?\b|outflows?|liquidat|plunge|crash|exploit|tumble`)

	reFiscal = regexp.MustCompile(`(?i)government shutdown|\bshutdown\b|debt ceiling|debt limit|credit (rating )?downgrade|downgrades? (us|u\.s\.|united states)|sovereign default`)

	reDataRelease = regexp.MustCompile(`(?i)\bactual\s+(-?\d[\d.,]*)\s*([%kmbt]?)`)
	reForecast    = regexp.MustCompile(`(?i)\bforecast\s+(-?\d[\d.,]*)`)
	rePrevious    = regexp.MustCompile(`(?i)\bprevious\s+(-?\d[\d.,]*)`)
	reInflation   = regexp.MustCompile(`(?i)\bcpi\b|\bpce\b|\bppi\b|inflation|price index|prices paid|hourly earnings|wage|employment cost`)
	reLaborSlack  = regexp.MustCompile(`(?i)unemployment|jobless claims|continuing claims|claimant count`)
	reGrowth      = regexp.MustCompile(`(?i)\bgdp\b|nonfarm|non-farm|payrolls|\badp\b|retail sales|\bpmi\b|\bism\b|durable goods|industrial production|housing starts|building permits|consumer confidence|consumer sentiment|factory orders|jolts|job openings|employment change|new home sales|existing home sales`)
	reJobs        = regexp.MustCompile(`(?i)nonfarm|non-farm|payrolls|\badp\b|jolts|job openings|employment change`)
	reNonUSYield  = regexp.MustCompile(`(?i)japan|\bjgb|german|bund|\bgilt|\buk\b|britain|france|french|ital|spain|spanish|australia|canada|china|chinese|korea|india|argentin|brazil|mexic|turk|indonesia|emerging`)
	reNonUSDollar = regexp.MustCompile(`(?i)(australian|aussie|canadian|new zealand|nz|taiwan|hong kong|singapore)\s+dollar|loonie|\bkiwi\b|dollar[- ](bond|denominated|debt)`)
	rePctMove     = regexp.MustCompile(`(-?\d+(?:\.\d+)?)\s*%`)
	reBpMove      = regexp.MustCompile(`(?i)(\d+(?:\.\d+)?)\s*(?:bps?|basis points?)\b`)
	reCrudeStocks = regexp.MustCompile(`(?i)crude (oil )?(stocks|inventor)|eia crude|api crude|cushing`)
	reEuroData    = regexp.MustCompile(`(?i)^(eu|ez|euro|eurozone|german|germany|france|french|italy|italian|uk|british|japan|japanese|jp|de|fr)\b`)

	// 资产名与动词之间最多 25 个字符：再远通常已是从句里另一个主语的动作 ("WTI hovers ... as Trump declines")
	reAssetMove = regexp.MustCompile(`(?i)\b(spot gold|gold|silver|wti|brent|crude|oil|copper|bitcoin|dollar index|dxy|dollar|s&p 500|s&p|spx|nasdaq|dow|us stocks|wall street|treasury yields?|10-year yields?|yields?|vix|yuan|offshore yuan|euro|yen|sterling|pound)\b[^,;:]{0,25}?\b((up|down)\s+[\d.]*\d|loses?|lost|sheds?|pares gains|rises?|rose|gains?|jumps?|surges?|climbs?|rebounds?|recovers?|rall(y|ies|ied)|soars?|spikes?|higher|hits? (a )?(record|fresh high|new high)|extends gains|falls?|fell|drops?|dropped|slides?|slips?|declines?|tumbles?|plunges?|sinks?|slumps?|crash(es)?|lower|extends losses|hits? (a )?(low|fresh low))\b`)
	reMoveUp    = regexp.MustCompile(`(?i)^up\b|^rise|^rose|^gain|jump|surge|climb|rebound|recover|rall|soar|spike|higher|record|high`)
	// 原油只有剧烈异动才沿传导链影响通胀预期；"edges higher" 一类温和措辞只记录油价本身
	reStrongMove  = regexp.MustCompile(`(?i)surge|soar|jump|spike|plunge|tumble|slump|crash|sink|rall`)
	reInvDraw     = regexp.MustCompile(`(?i)\b(declin|draw|fall|fell|drop|decreas)`)
	reInvBuild    = regexp.MustCompile(`(?i)\b(build|rise|rose|increas|jump|climb|swell)`)
	reTariffQuota = regexp.MustCompile(`(?i)tariff[- ](rate )?quota`)
	reNotPrice    = regexp.MustCompile(`(?i)\b(exports?|imports?|output|production|demand|shipments?|reserves?|bonds?|loans?|deposits?|sales)\b`)
	// 只有美元指数成分货币 (欧元、日元、英镑、加元、瑞郎、瑞典克朗) 的央行会影响 DXY
	reDXYCB = regexp.MustCompile(`(?i)\b(ecb|lagarde|boe|bailey|boj|ueda|boc|snb|bundesbank|riksbank)\b`)

	reEquity = regexp.MustCompile(`(?i)earnings|\beps\b|revenue|guidance|shares|stocks?\b|s&p|nasdaq|ipo`)
	reFX     = regexp.MustCompile(`(?i)\b(usd|eur|gbp|jpy|yen|euro|sterling|yuan|cnh|dollar|fx)\b`)
	reCommod = regexp.MustCompile(`(?i)gold|silver|oil|crude|brent|wti|copper|opec|natural gas|lng|wheat|commodit`)
)

// analyzeNewsHeadline 规则引擎：根据英文标题推断分类、是否美国相关以及对 11 项监控标的的方向性影响。
// 这是启发式判断，只给出方向提示，不代表交易建议。
func analyzeNewsHeadline(title string, breaking bool) newsAnalysis {
	t := strings.TrimSpace(strings.TrimPrefix(title, "FinancialJuice:"))
	lower := strings.ToLower(t)

	scores := map[string]int{}
	reasons := map[string][]string{}
	var drivers []NewsDriver
	basis := []string{}
	apply := func(key string) {
		d := macroPlaybookIndex[key]
		if d == nil {
			return
		}
		for _, nd := range drivers {
			if nd.Key == key {
				return
			}
		}
		drivers = append(drivers, NewsDriver{Key: d.Key, Title: d.Title, Chain: d.Chain, Caveat: d.Caveat})
		basis = appendUnique(basis, d.Title)
		for _, e := range d.Effects {
			scores[e.Symbol] += e.Score
			reasons[e.Symbol] = appendUnique(reasons[e.Symbol], d.Title+"："+e.Reason)
		}
	}
	direct := func(sym string, score int, reason string) {
		scores[sym] += score
		reasons[sym] = appendUnique(reasons[sym], reason)
		basis = appendUnique(basis, reason)
	}
	pick := func(cond bool, yes, no string) string {
		if cond {
			return yes
		}
		return no
	}

	categories := []string{}
	addCat := func(c string) { categories = appendUnique(categories, c) }

	isUS := reUSContext.MatchString(t)
	fedCtx := reFedSpeaker.MatchString(t)
	if fedCtx {
		isUS = true
	}

	// 1. 经济数据 (Actual vs Forecast)
	if m := reDataRelease.FindStringSubmatch(t); m != nil {
		actual, ok1 := parseNum(m[1])
		var ref float64
		var ok2 bool
		if f := reForecast.FindStringSubmatch(t); f != nil {
			ref, ok2 = parseNum(f[1])
		} else if p := rePrevious.FindStringSubmatch(t); p != nil {
			ref, ok2 = parseNum(p[1])
		}
		if ok1 && ok2 && actual != ref {
			addCat("宏观经济")
			up := actual > ref
			isChina := reChina.MatchString(t) || strings.HasPrefix(lower, "cn ")
			switch {
			case reCrudeStocks.MatchString(t):
				addCat("大宗商品")
				apply(pick(up, drvOilInvBuild, drvOilInvDraw))
			case isUS && reInflation.MatchString(t):
				apply(pick(up, drvUSInflationHot, drvUSInflationCool))
			case isUS && reLaborSlack.MatchString(t):
				// 失业率 / 初请高于预期 = 就业走弱
				apply(pick(up, drvUSJobsWeak, drvUSJobsStrong))
			case isUS && reJobs.MatchString(t):
				apply(pick(up, drvUSJobsStrong, drvUSJobsWeak))
			case isUS && reGrowth.MatchString(t):
				apply(pick(up, drvUSGrowthStrong, drvUSGrowthWeak))
			case isChina && (reGrowth.MatchString(t) || reInflation.MatchString(t)):
				apply(pick(up, drvChinaDataStrong, drvChinaDataWeak))
			case reEuroData.MatchString(t) && (reGrowth.MatchString(t) || reInflation.MatchString(t)):
				apply(pick(up, drvNonUSHawkish, drvNonUSDovish))
			}
		}
	}

	// 2. 央行与货币政策
	if fedCtx {
		addCat("央行货币政策")
		switch {
		case reHawkNeg.MatchString(t):
			apply(drvFedHawkish)
		case reHawk.MatchString(t) && !reDove.MatchString(t):
			apply(drvFedHawkish)
		case reDove.MatchString(t) && !reHawk.MatchString(t):
			apply(drvFedDovish)
		}
	} else if reOtherCB.MatchString(t) {
		addCat("央行货币政策")
		if !reDXYCB.MatchString(t) {
			// RBA / RBNZ 等不在美元指数篮子内，不推断 DXY 方向
		} else if reNonUSHike.MatchString(t) {
			apply(drvNonUSHawkish)
		} else if reNonUSCut.MatchString(t) {
			apply(drvNonUSDovish)
		}
	} else if rePBOC.MatchString(t) && !strings.Contains(lower, "reverse repo") {
		addCat("央行货币政策")
		if reChinaBoost.MatchString(t) || reNonUSCut.MatchString(t) {
			apply(drvPBOCEasing)
		}
	}

	// 3. 地缘政治
	calm := reGeoCalm.MatchString(t)
	calmNegated := calm && reCalmNegated.MatchString(t)
	if calmNegated {
		calm = false
	}
	escalate := calmNegated || (reGeoEscalate.MatchString(t) && !reSanctionRelief.MatchString(t))
	region := reMiddleEast.MatchString(t) || reRussia.MatchString(t)
	asia := reAsiaTension.MatchString(t)
	if calm || escalate {
		if region || asia || breaking || calm {
			addCat("地缘政治")
		}
	}
	switch {
	case calm && (region || asia):
		apply(drvGeoCalm)
		if region {
			apply(drvOilGeoCalm)
		}
	case calmNegated && region:
		// 和谈 / 缓和进程受挫，地缘风险溢价回升
		apply(drvGeoEscalation)
	case escalate && region:
		apply(drvGeoEscalation)
		apply(drvOilGeoRisk)
	case escalate && asia:
		apply(drvAsiaTension)
	}

	// 4. 贸易与关税
	if reTradeDeal.MatchString(t) {
		addCat("贸易关税")
		apply(drvTradeEasing)
		if reChina.MatchString(t) {
			apply(drvChinaTradeEase)
		}
	} else if reTradeWar.MatchString(t) && !reTariffQuota.MatchString(t) {
		addCat("贸易关税")
		apply(drvTradeTension)
		if reChina.MatchString(t) {
			apply(drvChinaTrade)
		}
	}

	// 5. 中国刺激
	if reChina.MatchString(t) && reChinaBoost.MatchString(t) && !strings.Contains(lower, "reverse repo") {
		addCat("宏观经济")
		apply(drvChinaStimulus)
	}

	// 6. 原油供给
	if reOilOutput.MatchString(t) {
		addCat("大宗商品")
		if reOutputCut.MatchString(t) {
			apply(drvOilSupplyCut)
		} else if reOutputUp.MatchString(t) {
			apply(drvOilSupplyUp)
		}
	} else if reOilAsset.MatchString(t) && escalate {
		addCat("大宗商品")
		apply(drvOilSupplyCut)
	}

	// 6b. 无具体数值的原油库存报道 ("Crude oil inventories show significant decline")
	if reCrudeStocks.MatchString(t) && reDataRelease.FindStringSubmatch(t) == nil {
		addCat("大宗商品")
		if reInvDraw.MatchString(t) {
			apply(drvOilInvDraw)
		} else if reInvBuild.MatchString(t) {
			apply(drvOilInvBuild)
		}
	}

	moves := reAssetMove.FindAllStringSubmatchIndex(t, -1)
	btcMove := false
	for _, idx := range moves {
		if strings.EqualFold(t[idx[2]:idx[3]], "bitcoin") {
			btcMove = true
		}
	}

	// 7. 加密货币 (标题已直接报道比特币涨跌时以价格为准，不再按事件关键词判断)
	if reCrypto.MatchString(t) && btcMove {
		addCat("加密货币")
	} else if reCrypto.MatchString(t) {
		addCat("加密货币")
		if reCryptoNeg.MatchString(t) {
			apply(drvCryptoNegative)
		} else if reCryptoPos.MatchString(t) {
			apply(drvCryptoPositive)
		}
	}

	// 8. 美国财政/政治风险
	if reFiscal.MatchString(t) {
		addCat("财政政治")
		apply(drvUSFiscalRisk)
	}

	// 9. 标题直接描述的价格异动。美债收益率、美元、原油的明显异动会沿传导链影响其他资产；
	// 幅度很小 (或非美国品种) 时只记录该标的本身。
	for _, idx := range moves {
		asset := strings.ToLower(t[idx[2]:idx[3]])
		// "non-oil exports jump"、"oil exports rise" 描述的是贸易 / 产量，不是价格
		if idx[2] >= 4 && strings.EqualFold(t[idx[2]-4:idx[2]], "non-") {
			continue
		}
		if reNotPrice.MatchString(t[idx[3]:idx[4]]) {
			continue
		}
		up := reMoveUp.MatchString(t[idx[4]:idx[5]])
		dir := -1
		if up {
			dir = 1
		}
		tail := t[idx[4]:]
		if len(tail) > 60 {
			tail = tail[:60]
		}
		pctMove, hasPct := 0.0, false
		if pm := rePctMove.FindStringSubmatch(tail); pm != nil {
			if v, ok := parseNum(pm[1]); ok {
				pctMove, hasPct = math.Abs(v), true
			}
		}
		const moveReason = "标题直接报道价格异动"
		switch {
		case strings.Contains(asset, "gold"):
			addCat("大宗商品")
			direct(symGold, 2*dir, moveReason)
		case asset == "silver":
			addCat("大宗商品")
			direct(symSilver, 2*dir, moveReason)
		case asset == "copper":
			addCat("大宗商品")
			direct(symCopper, 2*dir, moveReason)
		case asset == "bitcoin":
			addCat("加密货币")
			direct(symBTC, 2*dir, moveReason)
		case asset == "wti" || asset == "brent" || asset == "crude" || asset == "oil":
			addCat("大宗商品")
			if reCrudeStocks.MatchString(t) {
				continue
			}
			verb := t[idx[4]:idx[5]]
			if (hasPct && pctMove >= 1.5) || (!hasPct && reStrongMove.MatchString(verb)) {
				apply(pick(up, drvOilRally, drvOilSlump))
			} else if asset == "brent" {
				direct(symBrent, 2*dir, moveReason)
			} else if asset == "wti" {
				direct(symWTI, 2*dir, moveReason)
			} else {
				direct(symWTI, 2*dir, moveReason)
				direct(symBrent, 2*dir, moveReason)
			}
		case asset == "dollar index" || asset == "dxy" || asset == "dollar":
			if reNonUSDollar.MatchString(t) {
				continue
			}
			addCat("外汇")
			if !hasPct || pctMove >= 0.3 {
				apply(pick(up, drvUSDStrong, drvUSDWeak))
			} else {
				direct(symDXY, 2*dir, moveReason)
			}
		case asset == "euro" || asset == "yen" || asset == "sterling" || asset == "pound":
			// 非美货币走强 = 美元指数走弱
			addCat("外汇")
			direct(symDXY, -2*dir, moveReason+" (非美货币走强即美元指数走弱)")
		case strings.Contains(asset, "yuan"):
			// 人民币走强 = USDCNH 下行
			addCat("外汇")
			direct(symCNH, -2*dir, moveReason)
		case strings.Contains(asset, "yield"):
			if reNonUSYield.MatchString(t) && !reUSContext.MatchString(t) {
				continue
			}
			addCat("宏观经济")
			bpMove, hasBp := 0.0, false
			if bm := reBpMove.FindStringSubmatch(tail); bm != nil {
				if v, ok := parseNum(bm[1]); ok {
					bpMove, hasBp = v, true
				}
			}
			if !hasBp || bpMove >= 3 {
				apply(pick(up, drvYieldsUp, drvYieldsDown))
			} else {
				direct(symUS10Y, 2*dir, moveReason)
			}
		case asset == "vix":
			addCat("股市")
			direct(symVIX, 2*dir, moveReason)
		default:
			addCat("股市")
			direct(symSPX, 2*dir, moveReason)
		}
	}

	if len(categories) == 0 {
		switch {
		case reCommod.MatchString(t):
			categories = append(categories, "大宗商品")
		case reFX.MatchString(t):
			categories = append(categories, "外汇")
		case reEquity.MatchString(t):
			categories = append(categories, "股市")
		case reGeoEscalate.MatchString(t) || reGeoCalm.MatchString(t):
			categories = append(categories, "地缘政治")
		default:
			categories = append(categories, "综合快讯")
		}
	}

	var impacts []AssetImpact
	maxAbs := 0
	for _, sym := range impactAssetOrder {
		v := scores[sym]
		if v == 0 {
			continue
		}
		if abs(v) > maxAbs {
			maxAbs = abs(v)
		}
		dir := "bullish"
		if v < 0 {
			dir = "bearish"
		}
		impacts = append(impacts, AssetImpact{
			Symbol:    sym,
			Name:      impactAssetNames[sym],
			Direction: dir,
			Label:     impactLabel(sym, v > 0),
			Score:     v,
			Reason:    strings.Join(reasons[sym], "；"),
		})
	}
	sort.SliceStable(impacts, func(i, j int) bool { return abs(impacts[i].Score) > abs(impacts[j].Score) })

	res := newsAnalysis{
		Category: categories[0],
		IsUS:     isUS,
		Impacts:  impacts,
		Drivers:  drivers,
	}
	res.Impact, res.Summary = summarizeImpacts(impacts, basis)
	switch {
	case breaking || (isUS && maxAbs >= 2):
		res.ImpactLevel = "high"
	case len(impacts) > 0:
		res.ImpactLevel = "medium"
	default:
		res.ImpactLevel = "low"
	}
	return res
}

// summarizeImpacts basis 为命中的驱动标题与直接价格异动依据
func summarizeImpacts(impacts []AssetImpact, basis []string) (impact, summary string) {
	if len(impacts) == 0 {
		return "中性 / 待观察", "规则引擎未识别出对监控资产的明确方向性影响"
	}
	var bull, bear []string
	for _, im := range impacts {
		entry := im.Name
		if im.Label != "利好" && im.Label != "利空" {
			entry = im.Name + "(" + im.Label + ")"
		}
		if im.Direction == "bullish" {
			bull = append(bull, entry)
		} else {
			bear = append(bear, entry)
		}
	}
	parts := []string{}
	if len(bull) > 0 {
		parts = append(parts, "看涨: "+strings.Join(bull, "、"))
	}
	if len(bear) > 0 {
		parts = append(parts, "看跌: "+strings.Join(bear, "、"))
	}
	return strings.Join(parts, " | "), strings.Join(basis, "；")
}

func parseNum(s string) (float64, bool) {
	s = strings.ReplaceAll(strings.TrimSpace(s), ",", "")
	s = strings.TrimSuffix(s, ".")
	v, err := strconv.ParseFloat(s, 64)
	return v, err == nil
}

func appendUnique(list []string, v string) []string {
	if v == "" {
		return list
	}
	for _, x := range list {
		if x == v {
			return list
		}
	}
	return append(list, v)
}

func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

// formatImpactsForLog 生成报告日志中的资产影响行
func formatImpactsForLog(impacts []AssetImpact) string {
	if len(impacts) == 0 {
		return "中性 / 待观察"
	}
	parts := make([]string, 0, len(impacts))
	for _, im := range impacts {
		parts = append(parts, fmt.Sprintf("%s %s(%+d)", im.Name, im.Label, im.Score))
	}
	return strings.Join(parts, "; ")
}
