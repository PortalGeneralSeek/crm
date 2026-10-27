package service

import "testing"

func TestKlineIntervalSeconds(t *testing.T) {
	cases := map[string]int64{"1": 60, "15": 900, "30": 1800, "60": 3600, "1D": 86400, "1W": 604800}
	for iv, want := range cases {
		if got := klineIntervalSeconds(iv); got != want {
			t.Errorf("klineIntervalSeconds(%q) = %d, want %d", iv, got, want)
		}
	}
	for iv := range KlineIntervals {
		if _, ok := klineArchiveCadence[iv]; !ok {
			t.Errorf("interval %q has no archive cadence", iv)
		}
	}
}

func TestBarsToArchive(t *testing.T) {
	bars := []KlineBar{{Time: 100}, {Time: 200}, {Time: 300}, {Time: 400}, {Time: 500}}

	if got := barsToArchive(bars, klineArchiveRange{}); len(got) != len(bars) {
		t.Fatalf("empty archive should keep all bars, got %d", len(got))
	}

	got := barsToArchive(bars, klineArchiveRange{Earliest: 200, Latest: 400, Count: 3})
	want := []int64{100, 400, 500}
	if len(got) != len(want) {
		t.Fatalf("got %v, want times %v", got, want)
	}
	for i, b := range got {
		if b.Time != want[i] {
			t.Errorf("bar %d time = %d, want %d", i, b.Time, want[i])
		}
	}
}
