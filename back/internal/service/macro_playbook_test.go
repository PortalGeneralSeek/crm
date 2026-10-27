package service

import (
	"strings"
	"testing"
)

func hasDriver(an newsAnalysis, key string) bool {
	for _, d := range an.Drivers {
		if d.Key == key {
			return true
		}
	}
	return false
}

func TestPlaybookConsistency(t *testing.T) {
	seen := map[string]bool{}
	for _, d := range macroPlaybook {
		if seen[d.Key] {
			t.Fatalf("duplicate driver key %s", d.Key)
		}
		seen[d.Key] = true
		if d.Title == "" || len(d.Chain) < 2 || len(d.Effects) == 0 {
			t.Errorf("%s: incomplete driver", d.Key)
		}
		for _, e := range d.Effects {
			if impactAssetNames[e.Symbol] == "" || e.Score == 0 || e.Reason == "" {
				t.Errorf("%s: bad effect %+v", d.Key, e)
			}
		}
		if d.Opposite == "" {
			continue
		}
		o := macroPlaybookIndex[d.Opposite]
		if o == nil || o.Opposite != d.Key {
			t.Errorf("%s: opposite %s missing or not reciprocal", d.Key, d.Opposite)
			continue
		}
		for _, e := range d.Effects {
			for _, oe := range o.Effects {
				if oe.Symbol == e.Symbol && (oe.Score > 0) == (e.Score > 0) {
					t.Errorf("%s vs %s: %s has same direction in both", d.Key, o.Key, e.Name)
				}
			}
		}
	}
	for _, tr := range liveTriggers {
		if macroPlaybookIndex[tr.up] == nil || macroPlaybookIndex[tr.down] == nil {
			t.Errorf("live trigger %s references unknown driver", tr.symbol)
		}
	}
	for _, c := range []string{"US", "CN", "EU", "JP"} {
		od := macroOutcomeDrivers(c)
		if od == nil || macroPlaybookIndex[od.Above] == nil || macroPlaybookIndex[od.Below] == nil {
			t.Errorf("macro outcome drivers for %s invalid", c)
		}
	}
}

func TestAnalyzerDrivers(t *testing.T) {
	cases := []struct {
		title   string
		drivers []string
		absent  []string
		want    map[string]int
	}{
		{
			title:   "US CPI YoY Actual 3.4% (Forecast 3.1%, Previous 3.0%)",
			drivers: []string{drvUSInflationHot},
			want:    map[string]int{symGold: -1, symSPX: -1, symUS10Y: 1, symDXY: 1},
		},
		{
			title:   "US Core PPI MoM Actual 0.1% (Forecast 0.3%, Previous 0.2%)",
			drivers: []string{drvUSInflationCool},
			want:    map[string]int{symGold: 1, symSPX: 1, symUS10Y: -1, symDXY: -1},
		},
		{
			title:   "US Nonfarm Payrolls Actual 254K (Forecast 140K, Previous 159K)",
			drivers: []string{drvUSJobsStrong},
			want:    map[string]int{symUS10Y: 1, symGold: -1},
		},
		{
			title:   "US Unemployment Rate Actual 4.4% (Forecast 4.2%, Previous 4.2%)",
			drivers: []string{drvUSJobsWeak},
			want:    map[string]int{symUS10Y: -1, symGold: 1},
		},
		{
			title:   "US 10-year Treasury yield falls 8 bps to 4.02%",
			drivers: []string{drvYieldsDown},
			want:    map[string]int{symUS10Y: -1, symGold: 1, symSPX: 1, symDXY: -1},
		},
		{
			title:   "Treasury yields rise after strong data",
			drivers: []string{drvYieldsUp},
			want:    map[string]int{symGold: -1, symSPX: -1},
		},
		{
			title:  "Japan 10-year JGB yield rises to 1.95%, highest since 2008",
			absent: []string{drvYieldsUp},
			want:   map[string]int{symUS10Y: 0},
		},
		{
			title:  "Australian dollar rises 0.8% after RBA minutes",
			absent: []string{drvUSDWeak, drvUSDStrong},
			want:   map[string]int{symDXY: 0},
		},
		{
			title:  "Oil up 0.3% in Asian trade",
			absent: []string{drvOilRally},
			want:   map[string]int{symWTI: 1, symUS10Y: 0},
		},
		{
			title:   "Brent crude surges 4% as Houthi attack hits Red Sea tanker",
			drivers: []string{drvOilRally, drvGeoEscalation, drvOilGeoRisk},
			want:    map[string]int{symBrent: 1, symGold: 1},
		},
		{
			title:   "Dollar Index loses its CPI gain as AI stocks slide",
			drivers: []string{drvUSDWeak},
			absent:  []string{drvUSDStrong},
		},
		{
			title:   "Crude oil inventories show significant decline, surpassing expectations",
			drivers: []string{drvOilInvDraw},
			absent:  []string{drvOilSlump},
			want:    map[string]int{symWTI: 1},
		},
		{
			title:  "WTI hovers around $96.00 as Trump declines nuclear weapon use in Iran",
			absent: []string{drvOilSlump},
		},
		{
			title:  "Venezuela's Oil Recovery Gains Momentum as New Drilling Rigs Arrive",
			absent: []string{drvOilRally},
		},
		{
			title:  "Singapore non-oil exports jump bigger-than-expected 68.4% in September",
			absent: []string{drvOilRally},
			want:   map[string]int{symWTI: 0},
		},
		{
			title:  "Saudi oil exports rise to 7.2 million bpd in September",
			absent: []string{drvOilRally},
		},
		{
			title:  "China sets wheat import tariff quota for 2027 at 9.64 million metric tons",
			absent: []string{drvTradeTension, drvChinaTrade},
		},
		{
			title:  "Australian Dollar crumbles as job losses shatter RBA rate hike hopes",
			absent: []string{drvNonUSHawkish, drvNonUSDovish},
			want:   map[string]int{symDXY: 0},
		},
		{
			title:  "Bitcoin rebounds to $82,000 as PPI hits 6.3%, nearly $1B liquidated",
			absent: []string{drvCryptoNegative},
			want:   map[string]int{symBTC: 1},
		},
		{
			title:   "Dollar index climbs 0.6% to 101.2",
			drivers: []string{drvUSDStrong},
			want:    map[string]int{symDXY: 1, symGold: -1, symCNH: 1},
		},
	}
	for _, c := range cases {
		an := analyzeNewsHeadline(c.title, false)
		for _, k := range c.drivers {
			if !hasDriver(an, k) {
				t.Errorf("%q: missing driver %s (got %+v)", c.title, k, an.Drivers)
			}
		}
		for _, k := range c.absent {
			if hasDriver(an, k) {
				t.Errorf("%q: unexpected driver %s", c.title, k)
			}
		}
		for sym, dir := range c.want {
			got := impactScore(an, sym)
			if (dir > 0 && got <= 0) || (dir < 0 && got >= 0) || (dir == 0 && got != 0) {
				t.Errorf("%q: %s score=%d, want direction %d (impact=%s)", c.title, sym, got, dir, an.Impact)
			}
		}
	}

	an := analyzeNewsHeadline("US CPI YoY Actual 3.4% (Forecast 3.1%, Previous 3.0%)", false)
	for _, im := range an.Impacts {
		if im.Symbol == symGold && !strings.Contains(im.Reason, "实际利率") {
			t.Errorf("gold reason should explain the real-rate channel, got %q", im.Reason)
		}
	}
	if an.Summary != "美国通胀高于预期" {
		t.Errorf("summary = %q", an.Summary)
	}
}

func TestDetectLiveDrivers(t *testing.T) {
	quotes := map[string]QuoteItem{
		symUS10Y: {Symbol: symUS10Y, Price: 4.01, Change: -0.072},
		symGold:  {Symbol: symGold, Price: 4200, ChangePct: 0.8},
		symSPX:   {Symbol: symSPX, Price: 6000, ChangePct: -0.4},
		symDXY:   {Symbol: symDXY, Price: 99, ChangePct: -0.2},
		symVIX:   {Symbol: symVIX, Price: 17, ChangePct: 3},
	}
	live := DetectLiveDrivers(quotes)
	if len(live) != 1 || live[0].Key != drvYieldsDown {
		t.Fatalf("live = %+v", live)
	}
	l := live[0]
	if !strings.Contains(l.Trigger, "-7.2bp") {
		t.Errorf("trigger = %q", l.Trigger)
	}
	match := map[string]bool{}
	for _, c := range l.Checks {
		match[c.Symbol] = c.Match
	}
	if !match[symGold] || match[symSPX] || !match[symDXY] {
		t.Errorf("checks = %+v", l.Checks)
	}

	quotes[symVIX] = QuoteItem{Symbol: symVIX, Price: 25, ChangePct: -9}
	for _, l := range DetectLiveDrivers(quotes) {
		if l.Key == drvRiskOn {
			return
		}
	}
	t.Errorf("VIX -9%% should trigger risk_on (down threshold 8%%)")
}
