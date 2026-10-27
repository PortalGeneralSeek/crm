package service

import "testing"

func impactScore(an newsAnalysis, sym string) int {
	for _, im := range an.Impacts {
		if im.Symbol == sym {
			return im.Score
		}
	}
	return 0
}

func TestAnalyzeNewsHeadline(t *testing.T) {
	cases := []struct {
		title    string
		isUS     bool
		category string
		// 期望方向: +1 看涨 / -1 看跌 / 0 无影响
		want map[string]int
	}{
		{
			title: "Fed's Daly: more rate hikes likely, timing still under consideration",
			isUS:  true, category: "央行货币政策",
			want: map[string]int{symGold: -1, symDXY: 1, symUS10Y: 1, symSPX: -1},
		},
		{
			title: "Fed's Daly: risks to above-target inflation remain high, steady labor market allows focus on price stability",
			isUS:  true, category: "央行货币政策",
			want: map[string]int{symGold: -1, symDXY: 1},
		},
		{
			title: "US API Crude Oil Stock Change Actual -11.12M (Forecast 1.9M, Previous -2.09M)",
			isUS:  true, category: "宏观经济",
			want: map[string]int{symWTI: 1, symBrent: 1, symGold: 0},
		},
		{
			title: "US API Cushing Stock Change Actual 1.823M (Forecast -, Previous 0.866M)",
			isUS:  true,
			want:  map[string]int{symWTI: -1},
		},
		{
			title: "US CPI YoY Actual 3.4% (Forecast 3.1%, Previous 3.0%)",
			isUS:  true, category: "宏观经济",
			want: map[string]int{symGold: -1, symDXY: 1, symUS10Y: 1, symSPX: -1},
		},
		{
			title: "US Initial Jobless Claims Actual 260K (Forecast 225K, Previous 230K)",
			isUS:  true, category: "宏观经济",
			want: map[string]int{symGold: 1, symDXY: -1},
		},
		{
			title:    "IRGC: Strong explosion in Jeddah, Saudi Arabia.",
			category: "地缘政治",
			want:     map[string]int{symGold: 1, symWTI: 1, symVIX: 1, symSPX: -1},
		},
		{
			title: "US discussing easing some sanctions on shadow fleet vessels to reduce global freight rates, boost oil flows in Middle East",
			isUS:  true, category: "地缘政治",
			want: map[string]int{symWTI: -1, symGold: -1},
		},
		{
			title: "European officials reject US plan to unfreeze some Russian assets to revive Ukraine peace talks - FT",
			isUS:  true, category: "地缘政治",
			want: map[string]int{symGold: 1},
		},
		{
			title:    "Euro last up 0.63% at $1.1228",
			category: "外汇",
			want:     map[string]int{symDXY: -1},
		},
		{
			title: "Spot gold rises 1.2% to $4,250/oz",
			want:  map[string]int{symGold: 1},
		},
		{
			title: "USD/KRW climbs 0.7%, not 1%: co",
			isUS:  false,
		},
		{
			title: "China central bank injects 45 billion yuan via 7-day reverse repos at 1.40% vs prior 1.40%: statement",
			want:  map[string]int{symCopper: 0, symCNH: 0},
		},
		{
			title: "Trump: I hope the Pope recovers",
			isUS:  true,
			want:  map[string]int{symGold: 0},
		},
	}

	for _, c := range cases {
		an := analyzeNewsHeadline(c.title, false)
		if an.IsUS != c.isUS {
			t.Errorf("%q: IsUS=%v, want %v", c.title, an.IsUS, c.isUS)
		}
		if c.category != "" && an.Category != c.category {
			t.Errorf("%q: Category=%q, want %q", c.title, an.Category, c.category)
		}
		for sym, dir := range c.want {
			got := impactScore(an, sym)
			if (dir > 0 && got <= 0) || (dir < 0 && got >= 0) || (dir == 0 && got != 0) {
				t.Errorf("%q: %s score=%d, want direction %d (impact=%s)", c.title, sym, got, dir, an.Impact)
			}
		}
	}
}

func TestParseFJItems(t *testing.T) {
	msg := `[{"Tags":[],"NewsID":9806110,"Title":"Boj's Koeda: test","DatePublished":"2026-10-15T01:32:38.997","Breaking":true,"Labels":["Macro",{"Name":"Japan"}]}]`
	items := parseFJItems([]byte(msg))
	if len(items) != 1 || items[0].NewsID != 9806110 || !items[0].Breaking {
		t.Fatalf("unexpected items: %+v", items)
	}
	if got := parseFJTime(items[0].DatePublished).Format("2006-01-02 15:04:05"); got != "2026-10-15 01:32:38" {
		t.Fatalf("parseFJTime = %s", got)
	}
	if labelText(items[0].Labels[1]) != "Japan" {
		t.Fatalf("labelText object failed")
	}
}
