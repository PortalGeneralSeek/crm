package service

import "testing"

func TestUsStockApply(t *testing.T) {
	m := NewUsStockMonitor(NewMarketHub())

	m.apply("NASDAQ:NVDA", "ok", map[string]interface{}{
		"lp": 217.5, "chp": 1.57, "rtc": 219.1, "rchp": 0.74,
		"current_session": "post_market", "update_mode": "streaming", "pricescale": 100.0,
	})
	m.apply("NASDAQ:NVDA", "ok", map[string]interface{}{"rtc": nil, "current_session": "market"})
	m.apply("KRX:000660", "ok", map[string]interface{}{"lp": 1277000.0, "update_mode": "delayed_streaming_1200"})
	m.apply("TVC:SOX", "ok", map[string]interface{}{"lp": 11414.4, "volume": 1e100})
	m.apply("NYSE:GLW", "error", nil)
	m.apply("NASDAQ:UNKNOWN", "ok", map[string]interface{}{"lp": 1.0})

	snap := m.Snapshot()
	byKey := map[string]StockQuote{}
	for _, q := range snap.Stocks {
		byKey[q.Symbol] = q
	}
	if len(snap.Stocks) != len(usStocks) {
		t.Fatalf("snapshot size %d, want %d", len(snap.Stocks), len(usStocks))
	}
	nv := byKey["NASDAQ:NVDA"]
	if nv.Price != 217.5 || nv.ExtPrice != 0 || nv.ExtChangePct != 0.74 || nv.Session != "market" || nv.PriceScale != 100 {
		t.Fatalf("NVDA merged wrong: %+v", nv)
	}
	if hx := byKey["KRX:000660"]; hx.DelayMin != 20 {
		t.Fatalf("SK hynix delay = %d, want 20", hx.DelayMin)
	}
	if sox := byKey["TVC:SOX"]; sox.Volume != 0 {
		t.Fatalf("index placeholder volume not cleared: %v", sox.Volume)
	}
	if glw := byKey["NYSE:GLW"]; glw.Error == "" {
		t.Fatal("error status not recorded")
	}
	if snap.Status.Ready != 3 {
		t.Fatalf("ready = %d, want 3", snap.Status.Ready)
	}

	seen := map[string]bool{}
	groups := map[string]bool{}
	for _, g := range usStockGroups {
		groups[g.Key] = true
	}
	for _, d := range usStocks {
		if seen[d.Symbol] {
			t.Fatalf("duplicate symbol %s", d.Symbol)
		}
		seen[d.Symbol] = true
		if !groups[d.Group] {
			t.Fatalf("%s has unknown group %q", d.Symbol, d.Group)
		}
	}
}
