package service

import "testing"

func TestFJNewsURL(t *testing.T) {
	cases := map[string]string{
		"US Business Inventories MoM Actual 0.4% (Forecast 0.4%, Previous 0.8%, Revised 0.9%)":      "https://www.financialjuice.com/News/9807180/US-Business-Inventories-MoM-Actual-04-Forecast-04-Previous-08-Revised-09.aspx",
		"Four booms heard in vicinity of the Presidential Palace in Yemen's Aden - Three Witnesses": "https://www.financialjuice.com/News/9807180/Four-booms-heard-in-vicinity-of-the-Presidential-Palace-in-Yemens-Aden---Three-Witnesses.aspx",
		"": "https://www.financialjuice.com/News/9807180/news.aspx",
	}
	for title, want := range cases {
		if got := fjNewsURL(9807180, title); got != want {
			t.Errorf("fjNewsURL(%q)\n got %s\nwant %s", title, got, want)
		}
	}
}

func TestParseMacroHeadline(t *testing.T) {
	cases := []struct {
		title, series, country, kind, measure, stage, actual, forecast, previous, revised, beat string
		core                                                                                    bool
	}{
		{"US CPI YoY Actual 3.7% (Forecast 3.6%, Previous 3.4%)", "US CPI YoY", "US", "CPI", "YoY", "", "3.7%", "3.6%", "3.4%", "", "above", false},
		{"US PPI YoY Actual 6.3% (Forecast 5.4%, Previous 5.4%, Revised 5.6%)", "US PPI YoY", "US", "PPI", "YoY", "", "6.3%", "5.4%", "5.4%", "5.6%", "above", false},
		{"US Core PPI YoY Actual 5% (Forecast 4.4%, Previous 4.6%)", "US Core PPI YoY", "US", "PPI", "YoY", "", "5%", "4.4%", "4.6%", "", "above", true},
		{"US PPI YoY Actual 5.4% (Forecast 5.3%, Previous 4.7%, Revision 4.8%)", "US PPI YoY", "US", "PPI", "YoY", "", "5.4%", "5.3%", "4.7%", "4.8%", "above", false},
		{"Swiss PPI YoY Actual -0.2% (Forecast -, Previous -0.7%)", "Swiss PPI YoY", "CH", "PPI", "YoY", "", "-0.2%", "-", "-0.7%", "", "", false},
		{"Japanese PPI YoY Actual 6.8% (Forecast 7.6%, Previous 7.6%)", "Japanese PPI YoY", "JP", "PPI", "YoY", "", "6.8%", "7.6%", "7.6%", "", "below", false},
		{"S. Korean PPI YoY Actual 7.9% (Forecast -, Previous 7.7%)", "S. Korean PPI YoY", "KR", "PPI", "YoY", "", "7.9%", "-", "7.7%", "", "", false},
		{"Eurozone CPI YoY Final Actual 3.8% (Forecast 3.8%, Previous 3.8%)", "Eurozone CPI YoY", "EU", "CPI", "YoY", "Final", "3.8%", "3.8%", "3.8%", "", "inline", false},
		{"New Zealand CPI QoQ Actual 1.2% (Forecast 1.3%, Previous 1.5%)", "New Zealand CPI QoQ", "NZ", "CPI", "QoQ", "", "1.2%", "1.3%", "1.5%", "", "below", false},
		{"UK PPI Input Prices MoM Actual 0.4% (Forecast 0.2%, Previous 0.3%)", "UK PPI Input Prices MoM", "GB", "PPI", "MoM", "", "0.4%", "0.2%", "0.3%", "", "above", false},
	}
	for _, c := range cases {
		r, meta, ok := parseMacroHeadline(c.title)
		if !ok {
			t.Errorf("%q: not parsed", c.title)
			continue
		}
		if r.Series != c.series || meta.country != c.country || meta.kind != c.kind || meta.measure != c.measure ||
			meta.stage != c.stage || meta.core != c.core {
			t.Errorf("%q: got series=%q country=%s kind=%s measure=%s stage=%q core=%v", c.title, r.Series, meta.country, meta.kind, meta.measure, meta.stage, meta.core)
		}
		if r.Actual != c.actual || r.Forecast != c.forecast || r.Previous != c.previous || r.Revised != c.revised || r.Beat != c.beat {
			t.Errorf("%q: got actual=%s forecast=%s previous=%s revised=%q beat=%q", c.title, r.Actual, r.Forecast, r.Previous, r.Revised, r.Beat)
		}
	}

	for _, title := range []string{
		"Bitcoin drops to one-month low of $80k as hot U.S. CPI spurs rate hike bets",
		"US Business Inventories MoM Actual 0.4% (Forecast 0.4%, Previous 0.8%)",
		"US Dollar: Inflation data keeps Fed risks alive – Rabobank",
	} {
		if _, _, ok := parseMacroHeadline(title); ok {
			t.Errorf("%q: should not parse as CPI/PPI release", title)
		}
	}
}

func TestParseMacroSeriesCalendarTitles(t *testing.T) {
	cases := map[string]struct {
		key, country, label string
		headline            bool
	}{
		"US PPI YoY":                       {"US PPI YoY", "US", "PPI 同比", true},
		"Italian CPI MoM Final":            {"Italian CPI MoM", "IT", "CPI 环比", false},
		"BoC Core CPI YoY":                 {"BoC Core CPI YoY", "CA", "核心 CPI 同比", false},
		"Canadian CPI Trim":                {"Canadian CPI Trim", "CA", "CPI · Trim", false},
		"French CPI MoM NSA":               {"French CPI MoM NSA", "FR", "CPI 环比 · NSA", false},
		"Japanese Core CPI Nationwide YoY": {"Japanese Core CPI Nationwide YoY", "JP", "核心 CPI 同比 · Nationwide", false},
		"Spanish HICP YoY Flash":           {"Spanish HICP YoY", "ES", "HICP 同比", true},
	}
	for title, want := range cases {
		meta, ok := parseMacroSeries(title)
		if !ok {
			t.Errorf("%q: not parsed", title)
			continue
		}
		if meta.key != want.key || meta.country != want.country || macroLabel(meta) != want.label || isHeadlineSeries(meta) != want.headline {
			t.Errorf("%q: got key=%q country=%s label=%q headline=%v", title, meta.key, meta.country, macroLabel(meta), isHeadlineSeries(meta))
		}
	}
	for _, title := range []string{"University Michigan 1 Yr Inflation Final", "US Holiday", "Fed Chair Speaks on CPI"} {
		if _, ok := parseMacroSeries(title); ok {
			t.Errorf("%q: should not be a CPI/PPI series", title)
		}
	}
}
