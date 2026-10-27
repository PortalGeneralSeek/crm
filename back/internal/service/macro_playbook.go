package service

import (
	"fmt"
	"math"
	"strings"
)

// DriverEffect 某个宏观驱动对单一监控标的的传导结果
type DriverEffect struct {
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	Score     int    `json:"score"` // ±2 强 / ±1 弱，方向针对标的价格 (US10Y 为收益率、USDCNH 上行即人民币贬值)
	Direction string `json:"direction"`
	Label     string `json:"label"`
	Reason    string `json:"reason"`
}

// MacroDriver 宏观传导剧本：一个可识别的宏观事件 → 传导链 → 各资产方向与原因
type MacroDriver struct {
	Key      string         `json:"key"`
	Group    string         `json:"group"`
	Title    string         `json:"title"`
	Trigger  string         `json:"trigger"`
	Chain    []string       `json:"chain"`
	Effects  []DriverEffect `json:"effects"`
	Caveat   string         `json:"caveat,omitempty"`
	Opposite string         `json:"opposite,omitempty"`
}

// NewsDriver 快讯命中的宏观驱动 (随快讯推送，前端据此展示传导链)
type NewsDriver struct {
	Key    string   `json:"key"`
	Title  string   `json:"title"`
	Chain  []string `json:"chain"`
	Caveat string   `json:"caveat,omitempty"`
}

// LiveDriverSignal 由实时盘面涨跌触发的宏观驱动，并校验其余资产是否按剧本方向运行
type LiveDriverSignal struct {
	Key       string            `json:"key"`
	Title     string            `json:"title"`
	Trigger   string            `json:"trigger"` // 例如 "美债10Y收益率 -6.2bp"
	Chain     []string          `json:"chain"`
	Caveat    string            `json:"caveat,omitempty"`
	Checks    []LiveDriverCheck `json:"checks"`
	Confirmed int               `json:"confirmed"`
	Total     int               `json:"total"`
}

type LiveDriverCheck struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Expected  string  `json:"expected"` // bullish | bearish
	Label     string  `json:"label"`
	ChangePct float64 `json:"changePct"`
	Match     bool    `json:"match"`
}

const (
	drvUSInflationHot  = "us_inflation_hot"
	drvUSInflationCool = "us_inflation_cool"
	drvUSJobsStrong    = "us_jobs_strong"
	drvUSJobsWeak      = "us_jobs_weak"
	drvUSGrowthStrong  = "us_growth_strong"
	drvUSGrowthWeak    = "us_growth_weak"
	drvFedHawkish      = "fed_hawkish"
	drvFedDovish       = "fed_dovish"
	drvYieldsUp        = "us_yields_up"
	drvYieldsDown      = "us_yields_down"
	drvUSDStrong       = "usd_strong"
	drvUSDWeak         = "usd_weak"
	drvRiskOff         = "risk_off"
	drvRiskOn          = "risk_on"
	drvGeoEscalation   = "geo_escalation"
	drvGeoCalm         = "geo_calm"
	drvOilGeoRisk      = "oil_geo_risk"
	drvOilGeoCalm      = "oil_geo_calm"
	drvAsiaTension     = "asia_tension"
	drvOilSupplyCut    = "oil_supply_cut"
	drvOilSupplyUp     = "oil_supply_up"
	drvOilInvDraw      = "oil_inventory_draw"
	drvOilInvBuild     = "oil_inventory_build"
	drvOilRally        = "oil_rally"
	drvOilSlump        = "oil_slump"
	drvTradeTension    = "trade_tension"
	drvTradeEasing     = "trade_easing"
	drvChinaTrade      = "china_trade_tension"
	drvChinaTradeEase  = "china_trade_easing"
	drvChinaStimulus   = "china_stimulus"
	drvChinaDataStrong = "china_data_strong"
	drvChinaDataWeak   = "china_data_weak"
	drvPBOCEasing      = "pboc_easing"
	drvNonUSHawkish    = "nonus_hawkish"
	drvNonUSDovish     = "nonus_dovish"
	drvUSFiscalRisk    = "us_fiscal_risk"
	drvCryptoPositive  = "crypto_positive"
	drvCryptoNegative  = "crypto_negative"
)

func eff(sym string, score int, reason string) DriverEffect {
	return DriverEffect{
		Symbol:    sym,
		Name:      impactAssetNames[sym],
		Score:     score,
		Direction: map[bool]string{true: "bullish", false: "bearish"}[score > 0],
		Label:     impactLabel(sym, score > 0),
		Reason:    reason,
	}
}

// macroPlaybook 页面"宏观传导关系"面板、快讯资产研判与 AI 提示词共用的唯一数据源。
// 分组顺序即页面展示顺序。
var macroPlaybook = []MacroDriver{
	{
		Key: drvUSInflationHot, Group: "通胀", Opposite: drvUSInflationCool,
		Title:   "美国通胀高于预期",
		Trigger: "CPI / 核心 CPI / PCE / PPI 实际值高于市场预期",
		Chain:   []string{"通胀高于预期", "美联储降息预期降温 (甚至加息担忧)", "美债收益率、美元走高", "实际利率与估值折现率上升"},
		Effects: []DriverEffect{
			eff(symUS10Y, 2, "降息押注被削减，美债遭抛售推高收益率"),
			eff(symDXY, 2, "美债利差优势扩大，资金流入美元"),
			eff(symGold, -2, "实际利率上升抬高持有无息黄金的机会成本，美元走强进一步压制金价"),
			eff(symSilver, -2, "跟随黄金走弱，贵金属中弹性更大"),
			eff(symSPX, -1, "折现率上升压缩估值，成长与科技股首当其冲"),
			eff(symBTC, -1, "流动性收紧预期打压高风险资产"),
			eff(symVIX, 1, "利率路径不确定性上升，股市波动放大"),
			eff(symCNH, 1, "美元走强、中美利差走阔，人民币承压"),
		},
		Caveat: "若市场已提前定价或仅为单月扰动，影响会很快消退；若通胀走高引发滞胀担忧，黄金可能先跌后涨。",
	},
	{
		Key: drvUSInflationCool, Group: "通胀", Opposite: drvUSInflationHot,
		Title:   "美国通胀低于预期",
		Trigger: "CPI / 核心 CPI / PCE / PPI 实际值低于市场预期",
		Chain:   []string{"通胀低于预期", "美联储降息预期升温", "美债收益率、美元回落", "实际利率与估值折现率下降"},
		Effects: []DriverEffect{
			eff(symUS10Y, -2, "降息预期升温，资金买入美债压低收益率"),
			eff(symDXY, -2, "利差优势收窄，美元走弱"),
			eff(symGold, 2, "实际利率回落降低持有黄金的机会成本，美元走弱亦提供支撑"),
			eff(symSilver, 2, "跟随黄金上涨，弹性更大"),
			eff(symSPX, 1, "折现率下降推升估值，降息预期提振风险偏好"),
			eff(symBTC, 1, "宽松流动性预期利好高风险资产"),
			eff(symVIX, -1, "利率担忧缓解，波动回落"),
			eff(symCNH, -1, "美元走弱，人民币压力缓解"),
		},
		Caveat: "若通胀回落同时伴随经济明显走弱 (衰退担忧)，股市未必上涨。",
	},
	{
		Key: drvUSJobsStrong, Group: "就业", Opposite: drvUSJobsWeak,
		Title:   "美国就业强于预期",
		Trigger: "非农 / ADP / JOLTS 高于预期，或失业率 / 初请失业金低于预期",
		Chain:   []string{"就业强劲", "经济韧性强，美联储无需急于降息", "美债收益率、美元上行"},
		Effects: []DriverEffect{
			eff(symUS10Y, 2, "降息预期后移，收益率上行"),
			eff(symDXY, 1, "美国经济相对强势支撑美元"),
			eff(symGold, -1, "利率与美元上行压制黄金"),
			eff(symSilver, -1, "跟随黄金承压"),
			eff(symSPX, 1, "消费与盈利前景改善"),
			eff(symCNH, 1, "美元走强，人民币承压"),
		},
		Caveat: "\"好消息即坏消息\"：若市场更担心通胀与加息，强劲就业反而压制股市。",
	},
	{
		Key: drvUSJobsWeak, Group: "就业", Opposite: drvUSJobsStrong,
		Title:   "美国就业弱于预期",
		Trigger: "非农 / ADP / JOLTS 低于预期，或失业率 / 初请失业金高于预期",
		Chain:   []string{"就业降温", "降息预期升温 + 经济放缓担忧", "美债收益率、美元回落"},
		Effects: []DriverEffect{
			eff(symUS10Y, -2, "降息预期升温，收益率下行"),
			eff(symDXY, -1, "利差优势收窄，美元走弱"),
			eff(symGold, 1, "降息预期与避险需求共同支撑金价"),
			eff(symSilver, 1, "跟随黄金"),
			eff(symSPX, -1, "经济放缓与盈利下修担忧"),
			eff(symVIX, 1, "衰退担忧推升波动"),
			eff(symCNH, -1, "美元走弱，人民币压力缓解"),
		},
		Caveat: "若市场聚焦\"降息利好\"，股市可能不跌反涨；若数据弱到触发衰退交易，股市下跌、黄金与美债大涨。",
	},
	{
		Key: drvUSGrowthStrong, Group: "增长", Opposite: drvUSGrowthWeak,
		Title:   "美国经济数据强于预期",
		Trigger: "GDP、零售销售、ISM / PMI、耐用品订单等高于预期",
		Chain:   []string{"增长强于预期", "企业盈利与需求预期上修", "收益率、美元温和上行"},
		Effects: []DriverEffect{
			eff(symSPX, 1, "企业盈利预期改善"),
			eff(symUS10Y, 1, "增长预期上修推高收益率"),
			eff(symDXY, 1, "经济相对强势吸引资金"),
			eff(symGold, -1, "风险偏好与利率上行削弱避险需求"),
			eff(symWTI, 1, "原油需求预期改善"),
			eff(symBrent, 1, "原油需求预期改善"),
			eff(symCopper, 1, "工业需求预期改善"),
		},
	},
	{
		Key: drvUSGrowthWeak, Group: "增长", Opposite: drvUSGrowthStrong,
		Title:   "美国经济数据弱于预期",
		Trigger: "GDP、零售销售、ISM / PMI、耐用品订单等低于预期",
		Chain:   []string{"增长弱于预期", "盈利下修 + 降息预期升温", "收益率、美元回落，避险升温"},
		Effects: []DriverEffect{
			eff(symSPX, -1, "企业盈利下修担忧"),
			eff(symUS10Y, -1, "避险买盘与降息预期压低收益率"),
			eff(symDXY, -1, "美国经济相对走弱"),
			eff(symGold, 1, "降息预期与避险需求支撑金价"),
			eff(symWTI, -1, "原油需求担忧"),
			eff(symBrent, -1, "原油需求担忧"),
			eff(symCopper, -1, "工业需求担忧"),
		},
	},
	{
		Key: drvFedHawkish, Group: "美联储", Opposite: drvFedDovish,
		Title:   "美联储鹰派",
		Trigger: "官员表态不急于降息 / 通胀顽固 / 暗示加息，或议息结果偏鹰",
		Chain:   []string{"美联储释放鹰派信号", "降息推迟或加息概率上升", "美债收益率、美元上行", "黄金与风险资产承压"},
		Effects: []DriverEffect{
			eff(symUS10Y, 2, "政策利率预期上移，收益率上行"),
			eff(symDXY, 2, "利差支撑美元"),
			eff(symGold, -2, "实际利率预期上升，持有黄金机会成本增加"),
			eff(symSilver, -2, "跟随黄金走弱"),
			eff(symSPX, -1, "流动性收紧，估值承压"),
			eff(symBTC, -1, "流动性收紧压制投机资产"),
			eff(symVIX, 1, "政策不确定性推升波动"),
			eff(symCNH, 1, "中美利差走阔，人民币承压"),
		},
	},
	{
		Key: drvFedDovish, Group: "美联储", Opposite: drvFedHawkish,
		Title:   "美联储鸽派",
		Trigger: "官员支持降息 / 就业走弱担忧 / 通胀缓和表态，或议息结果偏鸽",
		Chain:   []string{"美联储释放鸽派信号", "降息预期升温", "美债收益率、美元回落", "黄金与风险资产受益"},
		Effects: []DriverEffect{
			eff(symUS10Y, -2, "政策利率预期下移，收益率下行"),
			eff(symDXY, -2, "利差收窄，美元走弱"),
			eff(symGold, 2, "实际利率预期下降，持有黄金机会成本降低"),
			eff(symSilver, 2, "跟随黄金上涨"),
			eff(symSPX, 1, "流动性宽松预期提振估值"),
			eff(symBTC, 1, "宽松预期利好高风险资产"),
			eff(symVIX, -1, "政策不确定性下降"),
			eff(symCNH, -1, "中美利差收窄，人民币走强"),
		},
	},
	{
		Key: drvYieldsUp, Group: "利率", Opposite: drvYieldsDown,
		Title:   "美债10年期收益率上行",
		Trigger: "快讯报道美债收益率走高，或盘面 US10Y 日内上行 ≥ 5bp",
		Chain:   []string{"美债收益率上行", "无风险利率 / 实际利率抬升", "黄金机会成本增加、股票折现率上升、美元利差走阔"},
		Effects: []DriverEffect{
			eff(symUS10Y, 2, "收益率上行本身"),
			eff(symGold, -1, "实际利率上升，持有无息黄金的机会成本增加"),
			eff(symSilver, -1, "跟随黄金"),
			eff(symSPX, -1, "折现率上升压缩估值，高估值科技 / 成长股受冲击更大"),
			eff(symDXY, 1, "美元利差优势扩大"),
			eff(symBTC, -1, "无风险收益提高，资金从高风险资产流出"),
			eff(symCNH, 1, "中美利差走阔，人民币承压"),
		},
		Caveat: "若收益率上行源于增长预期改善 (而非通胀或鹰派)，股市可能与收益率同涨。",
	},
	{
		Key: drvYieldsDown, Group: "利率", Opposite: drvYieldsUp,
		Title:   "美债10年期收益率下行",
		Trigger: "快讯报道美债收益率走低，或盘面 US10Y 日内下行 ≥ 5bp",
		Chain:   []string{"美债收益率下行", "无风险利率 / 实际利率下降", "黄金机会成本降低、股票折现率下降、美元利差收窄"},
		Effects: []DriverEffect{
			eff(symUS10Y, -2, "收益率下行本身"),
			eff(symGold, 1, "实际利率下降，持有黄金的机会成本降低，黄金最直接受益"),
			eff(symSilver, 1, "跟随黄金"),
			eff(symSPX, 1, "折现率下降抬升估值，利好成长 / 科技股"),
			eff(symDXY, -1, "美元利差优势收窄"),
			eff(symBTC, 1, "流动性改善预期"),
			eff(symCNH, -1, "中美利差收窄，人民币压力缓解"),
		},
		Caveat: "关键看原因：降息预期驱动 → 股市与黄金通常同涨；衰退担忧或避险恐慌驱动 (VIX 同步飙升) → 股市下跌，黄金上涨更明显。",
	},
	{
		Key: drvUSDStrong, Group: "美元", Opposite: drvUSDWeak,
		Title:   "美元走强",
		Trigger: "快讯报道美元指数走高，或盘面 DXY 日内上涨 ≥ 0.4%",
		Chain:   []string{"美元走强", "美元计价资产对非美买家变贵", "大宗商品与非美货币承压"},
		Effects: []DriverEffect{
			eff(symDXY, 2, "美元走强本身"),
			eff(symGold, -1, "美元计价黄金对非美买家更贵，需求受抑"),
			eff(symSilver, -1, "美元计价贵金属承压"),
			eff(symCopper, -1, "美元计价工业品承压"),
			eff(symWTI, -1, "美元计价原油承压"),
			eff(symBrent, -1, "美元计价原油承压"),
			eff(symCNH, 1, "人民币相对美元走弱"),
		},
		Caveat: "避险驱动的美元走强 (战争、金融危机) 时，美元与黄金可能同涨。",
	},
	{
		Key: drvUSDWeak, Group: "美元", Opposite: drvUSDStrong,
		Title:   "美元走弱",
		Trigger: "快讯报道美元指数走低，或盘面 DXY 日内下跌 ≥ 0.4%",
		Chain:   []string{"美元走弱", "美元计价资产对非美买家变便宜", "大宗商品与非美货币受益"},
		Effects: []DriverEffect{
			eff(symDXY, -2, "美元走弱本身"),
			eff(symGold, 1, "美元计价黄金对非美买家更便宜，需求改善"),
			eff(symSilver, 1, "美元计价贵金属受益"),
			eff(symCopper, 1, "美元计价工业品受益"),
			eff(symWTI, 1, "美元计价原油受益"),
			eff(symBrent, 1, "美元计价原油受益"),
			eff(symCNH, -1, "人民币相对美元走强"),
		},
	},
	{
		Key: drvRiskOff, Group: "风险情绪", Opposite: drvRiskOn,
		Title:   "风险偏好骤降 (美股大跌 / VIX 飙升)",
		Trigger: "盘面标普500日内下跌 ≥ 1.5% 或 VIX 日内上涨 ≥ 10%",
		Chain:   []string{"股市大跌、VIX 飙升", "去杠杆与避险", "资金流向美债与黄金"},
		Effects: []DriverEffect{
			eff(symSPX, -2, "风险资产被集中抛售"),
			eff(symVIX, 2, "恐慌情绪上升"),
			eff(symGold, 1, "避险需求升温"),
			eff(symUS10Y, -1, "避险资金买入美债压低收益率"),
			eff(symBTC, -1, "高风险资产同步去杠杆"),
			eff(symCopper, -1, "增长担忧压制工业品"),
		},
		Caveat: "极端流动性危机中黄金可能因保证金追缴被抛售而短暂下跌 (如 2020 年 3 月)。",
	},
	{
		Key: drvRiskOn, Group: "风险情绪", Opposite: drvRiskOff,
		Title:   "风险偏好回升 (美股大涨 / VIX 回落)",
		Trigger: "盘面标普500日内上涨 ≥ 1.2% 或 VIX 日内下跌 ≥ 8%",
		Chain:   []string{"股市上涨、VIX 回落", "风险偏好回升", "资金从避险资产流向风险资产"},
		Effects: []DriverEffect{
			eff(symSPX, 2, "风险偏好回升"),
			eff(symVIX, -2, "恐慌情绪回落"),
			eff(symBTC, 1, "高风险资产同步受益"),
			eff(symGold, -1, "避险需求降温"),
			eff(symCopper, 1, "增长预期改善"),
		},
		Caveat: "流动性充裕阶段黄金常与股市同涨，避险降温对金价的压制可能有限。",
	},
	{
		Key: drvGeoEscalation, Group: "地缘", Opposite: drvGeoCalm,
		Title:   "地缘冲突升级",
		Trigger: "袭击、导弹、军事行动、制裁、核威胁等冲突升级类快讯",
		Chain:   []string{"地缘冲突升级", "避险情绪升温", "资金流入黄金与美债，抛售风险资产"},
		Effects: []DriverEffect{
			eff(symGold, 2, "传统避险资产，避险买盘涌入"),
			eff(symSilver, 1, "跟随黄金，但工业属性削弱避险弹性"),
			eff(symVIX, 2, "恐慌情绪上升"),
			eff(symSPX, -1, "风险偏好下降"),
			eff(symBTC, -1, "高风险资产遭抛售"),
			eff(symUS10Y, -1, "避险资金买入美债压低收益率"),
		},
		Caveat: "美元也具避险属性，短期可能与黄金同涨；冲突若迅速降温，避险溢价会快速回吐。",
	},
	{
		Key: drvGeoCalm, Group: "地缘", Opposite: drvGeoEscalation,
		Title:   "地缘局势缓和",
		Trigger: "停火、和谈进展、撤军、解除制裁等缓和类快讯",
		Chain:   []string{"地缘局势缓和", "避险需求回落", "避险溢价回吐，风险资产修复"},
		Effects: []DriverEffect{
			eff(symGold, -2, "避险溢价回吐"),
			eff(symSilver, -1, "跟随黄金回落"),
			eff(symVIX, -2, "恐慌情绪回落"),
			eff(symSPX, 1, "风险偏好回升"),
			eff(symBTC, 1, "风险资产修复"),
			eff(symUS10Y, 1, "避险资金撤出美债，收益率回升"),
		},
	},
	{
		Key: drvOilGeoRisk, Group: "地缘", Opposite: drvOilGeoCalm,
		Title:   "产油区地缘风险 (中东 / 俄罗斯)",
		Trigger: "中东、霍尔木兹、红海、俄乌等产油或航运要道相关冲突",
		Chain:   []string{"产油区或航道冲突", "原油供应 / 运输中断担忧", "油价计入风险溢价", "通胀预期抬升"},
		Effects: []DriverEffect{
			eff(symWTI, 2, "供应中断风险推升油价风险溢价"),
			eff(symBrent, 2, "布伦特对中东与海运风险更敏感"),
		},
		Caveat: "若实际供应未受损，风险溢价往往在数日内回吐。",
	},
	{
		Key: drvOilGeoCalm, Group: "地缘", Opposite: drvOilGeoRisk,
		Title:   "产油区局势缓和",
		Trigger: "中东、俄乌等产油区停火 / 和谈 / 解除制裁",
		Chain:   []string{"产油区局势缓和", "供应中断担忧消退", "油价风险溢价回落"},
		Effects: []DriverEffect{
			eff(symWTI, -2, "供应风险溢价回落"),
			eff(symBrent, -2, "供应风险溢价回落"),
		},
	},
	{
		Key: drvAsiaTension, Group: "地缘",
		Title:   "亚太地缘紧张",
		Trigger: "台海、朝鲜半岛、南海等亚太紧张局势",
		Chain:   []string{"亚太地缘紧张", "避险情绪升温 + 区域供应链担忧", "黄金走强，人民币与工业金属承压"},
		Effects: []DriverEffect{
			eff(symGold, 2, "避险买盘涌入"),
			eff(symSilver, 1, "跟随黄金"),
			eff(symVIX, 2, "恐慌情绪上升"),
			eff(symSPX, -1, "风险偏好下降"),
			eff(symBTC, -1, "风险资产遭抛售"),
			eff(symUS10Y, -1, "避险买入美债"),
			eff(symCNH, 1, "区域风险压制人民币"),
			eff(symCopper, -1, "亚洲工业需求与供应链担忧"),
		},
	},
	{
		Key: drvOilSupplyCut, Group: "原油", Opposite: drvOilSupplyUp,
		Title:   "原油供给收缩",
		Trigger: "OPEC+ 减产、产油设施遇袭 / 停产、出口中断",
		Chain:   []string{"原油供给收缩", "油价上涨", "能源通胀预期抬升"},
		Effects: []DriverEffect{
			eff(symWTI, 2, "供给收缩推升油价"),
			eff(symBrent, 2, "供给收缩推升油价"),
			eff(symUS10Y, 1, "油价上涨推升通胀预期"),
		},
		Caveat: "若同期需求明显走弱，油价涨幅有限。",
	},
	{
		Key: drvOilSupplyUp, Group: "原油", Opposite: drvOilSupplyCut,
		Title:   "原油供给增加",
		Trigger: "OPEC+ 增产、恢复出口、解除对产油国制裁",
		Chain:   []string{"原油供给增加", "油价下跌", "能源通胀预期回落"},
		Effects: []DriverEffect{
			eff(symWTI, -2, "供给增加压低油价"),
			eff(symBrent, -2, "供给增加压低油价"),
			eff(symUS10Y, -1, "通胀预期降温"),
		},
	},
	{
		Key: drvOilInvDraw, Group: "原油", Opposite: drvOilInvBuild,
		Title:   "原油库存降幅超预期",
		Trigger: "EIA / API 原油库存变化低于预期 (去库更多)",
		Chain:   []string{"库存去化超预期", "需求强于供给", "油价获得支撑"},
		Effects: []DriverEffect{
			eff(symWTI, 2, "美国库存去化直接利多 WTI"),
			eff(symBrent, 1, "跟随 WTI"),
		},
	},
	{
		Key: drvOilInvBuild, Group: "原油", Opposite: drvOilInvDraw,
		Title:   "原油库存增幅超预期",
		Trigger: "EIA / API 原油库存变化高于预期 (累库更多)",
		Chain:   []string{"库存累积超预期", "供给宽松 / 需求偏弱", "油价承压"},
		Effects: []DriverEffect{
			eff(symWTI, -2, "美国库存累积直接利空 WTI"),
			eff(symBrent, -1, "跟随 WTI"),
		},
	},
	{
		Key: drvOilRally, Group: "原油", Opposite: drvOilSlump,
		Title:   "油价大幅上涨",
		Trigger: "快讯报道油价大涨，或盘面 WTI 日内上涨 ≥ 2.5%",
		Chain:   []string{"油价大涨", "能源通胀预期抬升", "收益率上行压力，滞胀担忧"},
		Effects: []DriverEffect{
			eff(symWTI, 2, "油价上涨本身"),
			eff(symBrent, 2, "油价上涨本身"),
			eff(symUS10Y, 1, "通胀预期抬升推高收益率"),
		},
		Caveat: "油价持续高企会加剧滞胀担忧，此时黄金往往受益而股市承压。",
	},
	{
		Key: drvOilSlump, Group: "原油", Opposite: drvOilRally,
		Title:   "油价大幅下跌",
		Trigger: "快讯报道油价大跌，或盘面 WTI 日内下跌 ≥ 2.5%",
		Chain:   []string{"油价大跌", "能源通胀预期回落", "收益率下行压力"},
		Effects: []DriverEffect{
			eff(symWTI, -2, "油价下跌本身"),
			eff(symBrent, -2, "油价下跌本身"),
			eff(symUS10Y, -1, "通胀预期回落压低收益率"),
		},
		Caveat: "若油价下跌源于全球需求衰退担忧，股市与铜通常同步走弱。",
	},
	{
		Key: drvTradeTension, Group: "贸易", Opposite: drvTradeEasing,
		Title:   "关税 / 贸易摩擦升级",
		Trigger: "加征关税、出口管制、实体清单、反倾销等",
		Chain:   []string{"贸易壁垒升级", "全球增长与企业盈利预期下修", "风险偏好下降，避险需求上升"},
		Effects: []DriverEffect{
			eff(symSPX, -1, "企业成本上升与盈利下修"),
			eff(symVIX, 1, "不确定性推升波动"),
			eff(symGold, 1, "不确定性推升避险需求"),
			eff(symCopper, -1, "全球贸易与工业需求担忧"),
			eff(symBTC, -1, "风险资产承压"),
		},
		Caveat: "关税会推高进口价格，可能同时抬升美国通胀预期与收益率。",
	},
	{
		Key: drvTradeEasing, Group: "贸易", Opposite: drvTradeTension,
		Title:   "贸易紧张缓和",
		Trigger: "贸易协议、关税下调 / 暂停 / 豁免",
		Chain:   []string{"贸易紧张缓和", "增长与盈利预期改善", "风险偏好回升"},
		Effects: []DriverEffect{
			eff(symSPX, 1, "盈利预期改善"),
			eff(symVIX, -1, "不确定性下降"),
			eff(symGold, -1, "避险需求降温"),
			eff(symCopper, 1, "贸易与工业需求预期改善"),
			eff(symBTC, 1, "风险资产修复"),
		},
	},
	{
		Key: drvChinaTrade, Group: "贸易", Opposite: drvChinaTradeEase,
		Title:   "对华贸易摩擦升级",
		Trigger: "针对中国的关税、出口管制或制裁",
		Chain:   []string{"对华贸易摩擦升级", "中国出口与增长预期下修", "人民币承压"},
		Effects: []DriverEffect{
			eff(symCNH, 1, "出口前景恶化与资本流出压力压制人民币"),
		},
	},
	{
		Key: drvChinaTradeEase, Group: "贸易", Opposite: drvChinaTrade,
		Title:   "中美贸易缓和",
		Trigger: "中美贸易谈判进展、关税下调",
		Chain:   []string{"中美贸易缓和", "中国出口与增长预期改善", "人民币走强"},
		Effects: []DriverEffect{
			eff(symCNH, -1, "贸易前景改善利好人民币"),
		},
	},
	{
		Key: drvChinaStimulus, Group: "中国",
		Title:   "中国稳增长 / 刺激政策",
		Trigger: "降准降息、专项债、地产支持、财政刺激",
		Chain:   []string{"中国出台刺激政策", "基建与工业需求预期改善", "铜、原油等工业品受益"},
		Effects: []DriverEffect{
			eff(symCopper, 2, "中国是全球最大铜消费国，需求预期改善"),
			eff(symWTI, 1, "原油需求预期改善"),
			eff(symBrent, 1, "原油需求预期改善"),
			eff(symCNH, -1, "增长预期改善支撑人民币"),
		},
	},
	{
		Key: drvChinaDataStrong, Group: "中国", Opposite: drvChinaDataWeak,
		Title:   "中国经济数据强于预期",
		Trigger: "中国 GDP、PMI、工业增加值、通胀等高于预期",
		Chain:   []string{"中国经济强于预期", "全球工业品需求预期上修", "铜、原油与人民币受益"},
		Effects: []DriverEffect{
			eff(symCopper, 2, "中国工业需求预期上修"),
			eff(symWTI, 1, "原油需求预期改善"),
			eff(symBrent, 1, "原油需求预期改善"),
			eff(symCNH, -1, "增长预期改善支撑人民币"),
		},
	},
	{
		Key: drvChinaDataWeak, Group: "中国", Opposite: drvChinaDataStrong,
		Title:   "中国经济数据弱于预期",
		Trigger: "中国 GDP、PMI、工业增加值、通胀等低于预期",
		Chain:   []string{"中国经济弱于预期", "全球工业品需求预期下修", "铜、原油与人民币承压"},
		Effects: []DriverEffect{
			eff(symCopper, -2, "中国工业需求预期下修"),
			eff(symWTI, -1, "原油需求担忧"),
			eff(symBrent, -1, "原油需求担忧"),
			eff(symCNH, 1, "增长担忧压制人民币"),
		},
	},
	{
		Key: drvPBOCEasing, Group: "中国",
		Title:   "中国央行宽松",
		Trigger: "中国人民银行降准、降息或下调 LPR",
		Chain:   []string{"中国央行宽松", "中美利差扩大 + 国内流动性改善", "人民币承压，工业品需求预期改善"},
		Effects: []DriverEffect{
			eff(symCNH, 1, "中美利差扩大，人民币承压"),
			eff(symCopper, 1, "流动性改善提振工业品需求"),
		},
	},
	{
		Key: drvNonUSHawkish, Group: "非美", Opposite: drvNonUSDovish,
		Title:   "非美央行偏鹰 / 非美数据强于预期",
		Trigger: "欧洲、英国、日本等央行偏鹰或经济数据高于预期",
		Chain:   []string{"非美货币利率预期上升", "欧元、英镑、日元走强", "美元指数被动走低"},
		Effects: []DriverEffect{
			eff(symDXY, -1, "美元指数中欧元、日元权重较高，非美货币走强即美元指数走低"),
		},
	},
	{
		Key: drvNonUSDovish, Group: "非美", Opposite: drvNonUSHawkish,
		Title:   "非美央行偏鸽 / 非美数据弱于预期",
		Trigger: "欧洲、英国、日本等央行偏鸽或经济数据低于预期",
		Chain:   []string{"非美货币利率预期下降", "欧元、英镑、日元走弱", "美元指数被动走高"},
		Effects: []DriverEffect{
			eff(symDXY, 1, "非美货币走弱推高美元指数"),
		},
	},
	{
		Key: drvUSFiscalRisk, Group: "财政",
		Title:   "美国财政 / 债务风险",
		Trigger: "政府停摆、债务上限、主权评级下调",
		Chain:   []string{"美国财政与政治风险上升", "美元信用与美债吸引力受质疑", "资金转向黄金等硬资产"},
		Effects: []DriverEffect{
			eff(symGold, 2, "对冲美元信用风险的首选资产"),
			eff(symSilver, 1, "跟随黄金"),
			eff(symDXY, -1, "美元信用受损"),
			eff(symVIX, 1, "政策不确定性上升"),
			eff(symSPX, -1, "风险偏好下降"),
		},
		Caveat: "评级下调可能推高美债期限溢价 (收益率上行)；政府停摆则会推迟数据发布、加大降息预期。",
	},
	{
		Key: drvCryptoPositive, Group: "加密", Opposite: drvCryptoNegative,
		Title:   "加密市场利好事件",
		Trigger: "ETF 资金流入、监管放松、机构 / 国家储备采用",
		Chain:   []string{"加密利好事件", "增量资金预期", "比特币走强"},
		Effects: []DriverEffect{
			eff(symBTC, 2, "增量资金与情绪改善"),
		},
	},
	{
		Key: drvCryptoNegative, Group: "加密", Opposite: drvCryptoPositive,
		Title:   "加密市场利空事件",
		Trigger: "交易所被黑、监管打压、资金流出、大规模清算",
		Chain:   []string{"加密利空事件", "资金流出与去杠杆", "比特币走弱"},
		Effects: []DriverEffect{
			eff(symBTC, -2, "资金流出与情绪恶化"),
		},
	},
}

var macroPlaybookIndex = func() map[string]*MacroDriver {
	m := make(map[string]*MacroDriver, len(macroPlaybook))
	for i := range macroPlaybook {
		m[macroPlaybook[i].Key] = &macroPlaybook[i]
	}
	return m
}()

// MacroPlaybook 返回宏观传导剧本 (只读)
func MacroPlaybook() []MacroDriver {
	return macroPlaybook
}

// liveTrigger 盘面触发阈值：标的日内涨跌超过阈值即认为对应驱动正在发生 (与剧本 Trigger 描述保持一致)
type liveTrigger struct {
	symbol         string
	up, down       string
	upThr, downThr float64 // US10Y 为 bp，其余为涨跌幅 %
	bp             bool
}

var liveTriggers = []liveTrigger{
	{symbol: symUS10Y, up: drvYieldsUp, down: drvYieldsDown, upThr: 5, downThr: 5, bp: true},
	{symbol: symDXY, up: drvUSDStrong, down: drvUSDWeak, upThr: 0.4, downThr: 0.4},
	{symbol: symWTI, up: drvOilRally, down: drvOilSlump, upThr: 2.5, downThr: 2.5},
	{symbol: symVIX, up: drvRiskOff, down: drvRiskOn, upThr: 10, downThr: 8},
	{symbol: symSPX, up: drvRiskOn, down: drvRiskOff, upThr: 1.2, downThr: 1.5},
}

// LiveTriggerRule 供前端用 WSS 推送的行情就地判断盘面驱动 (与 DetectLiveDrivers 同一套阈值)
type LiveTriggerRule struct {
	Symbol  string  `json:"symbol"`
	Up      string  `json:"up"`
	Down    string  `json:"down"`
	UpThr   float64 `json:"upThr"`
	DownThr float64 `json:"downThr"`
	Unit    string  `json:"unit"` // bp: 用 change×100 (收益率百分点→基点)；pct: 用 changePct
}

type PlaybookResponse struct {
	Drivers  []MacroDriver      `json:"drivers"`
	Triggers []LiveTriggerRule  `json:"triggers"`
	Live     []LiveDriverSignal `json:"live"`
}

func LiveTriggerRules() []LiveTriggerRule {
	out := make([]LiveTriggerRule, 0, len(liveTriggers))
	for _, tr := range liveTriggers {
		unit := "pct"
		if tr.bp {
			unit = "bp"
		}
		out = append(out, LiveTriggerRule{Symbol: tr.symbol, Up: tr.up, Down: tr.down, UpThr: tr.upThr, DownThr: tr.downThr, Unit: unit})
	}
	return out
}

// DetectLiveDrivers 根据实时行情日内涨跌识别正在发生的宏观驱动，并逐项校验其余资产是否按剧本方向运行
func DetectLiveDrivers(quotes map[string]QuoteItem) []LiveDriverSignal {
	var out []LiveDriverSignal
	seen := map[string]bool{}
	for _, tr := range liveTriggers {
		q, ok := quotes[tr.symbol]
		if !ok || q.Price <= 0 {
			continue
		}
		move := q.ChangePct
		unit := "%"
		if tr.bp {
			move = q.Change * 100
			unit = "bp"
		}
		key := ""
		switch {
		case move >= tr.upThr:
			key = tr.up
		case move <= -tr.downThr:
			key = tr.down
		}
		if key == "" || seen[key] {
			continue
		}
		d := macroPlaybookIndex[key]
		if d == nil {
			continue
		}
		seen[key] = true
		sig := LiveDriverSignal{
			Key:     d.Key,
			Title:   d.Title,
			Trigger: fmt.Sprintf("%s %+.1f%s", impactAssetNames[tr.symbol], move, unit),
			Chain:   d.Chain,
			Caveat:  d.Caveat,
		}
		for _, e := range d.Effects {
			if e.Symbol == tr.symbol {
				continue
			}
			oq, ok := quotes[e.Symbol]
			if !ok || oq.Price <= 0 {
				continue
			}
			chk := LiveDriverCheck{Symbol: e.Symbol, Name: e.Name, Expected: e.Direction, Label: e.Label, ChangePct: math.Round(oq.ChangePct*100) / 100}
			chk.Match = (e.Score > 0 && oq.ChangePct > 0) || (e.Score < 0 && oq.ChangePct < 0)
			if chk.Match {
				sig.Confirmed++
			}
			sig.Total++
			sig.Checks = append(sig.Checks, chk)
		}
		out = append(out, sig)
	}
	return out
}

// formatPlaybookForPrompt 生成供大模型参考的传导关系摘要 (只列命中快讯或盘面的驱动，避免提示词过长)
func formatPlaybookForPrompt(keys []string) string {
	var b strings.Builder
	for _, k := range keys {
		d := macroPlaybookIndex[k]
		if d == nil {
			continue
		}
		parts := make([]string, 0, len(d.Effects))
		for _, e := range d.Effects {
			arrow := "↑"
			if e.Score < 0 {
				arrow = "↓"
			}
			parts = append(parts, e.Name+arrow)
		}
		fmt.Fprintf(&b, "- **%s**：%s → %s", d.Title, strings.Join(d.Chain, " → "), strings.Join(parts, " "))
		if d.Caveat != "" {
			fmt.Fprintf(&b, "（注意：%s）", d.Caveat)
		}
		b.WriteString("\n")
	}
	return b.String()
}
