import { useCallback, useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { crmApi, useAuth } from '../services/crmApi';
import { SYMBOLS, klinePath } from '../data/marketSymbols';

const INTERVALS = [
  { value: '1', label: '1分钟' },
  { value: '15', label: '15分钟' },
  { value: '30', label: '30分钟' },
  { value: '60', label: '1小时' },
  { value: '1D', label: '日线' },
  { value: '1W', label: '周线' },
];
const DATE_ONLY_INTERVALS = new Set(['1D', '1W']);
const INTERVAL_KEY = 'crm-kline-interval';
// 向左拖动到距最早一根不足该数量时，从本地归档加载更早的 K 线
const OLDER_PAGE_BARS = 1000;
const OLDER_TRIGGER_BARS = 40;

// 红涨绿跌
const UP = '#ef4444';
const DOWN = '#16a34a';
const UP_VOL = 'rgba(239, 68, 68, 0.45)';
const DOWN_VOL = 'rgba(22, 163, 74, 0.45)';

// lightweight-charts 按 UTC 渲染时间轴，整体平移 8 小时后坐标轴与十字光标即为北京时间
const BJ_OFFSET = 8 * 3600;
const INITIAL_VISIBLE_BARS = 160;

const SYMBOL_NOTES = {
  'COMEX:HG1!': 'COMEX 期货为交易所延时行情 (约 10-15 分钟)',
  'TVC:SPX': '指数仅在美股交易时段更新',
  'TVC:VIX': '指数仅在美股交易时段更新',
  'TVC:US10Y': '收益率主要在美国交易时段更新',
};

const pad = (n) => String(n).padStart(2, '0');
const formatChartTime = (t) => {
  const d = new Date(t * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const formatChartDate = (t) => formatChartTime(t).slice(0, 10);
const volumeFormatter = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 });

const toChartBar = (b) => ({
  time: b.time + BJ_OFFSET,
  open: b.open,
  high: b.high,
  low: b.low,
  close: b.close,
  volume: b.volume || 0,
});
const toVolumeBar = (b) => ({ time: b.time, value: b.volume, color: b.close >= b.open ? UP_VOL : DOWN_VOL });

const themeOptions = (isDark) => {
  const line = isDark ? 'rgba(63, 63, 70, 0.45)' : 'rgba(228, 228, 231, 0.9)';
  const label = isDark ? '#3f3f46' : '#52525b';
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: isDark ? '#a1a1aa' : '#52525b',
      fontFamily: "'JetBrains Mono', 'Noto Sans SC', monospace",
      fontSize: 11,
    },
    grid: { vertLines: { color: line }, horzLines: { color: line } },
    rightPriceScale: { borderColor: line },
    timeScale: { borderColor: line },
    crosshair: { vertLine: { labelBackgroundColor: label }, horzLine: { labelBackgroundColor: label } },
  };
};

function readStoredInterval() {
  try {
    const v = localStorage.getItem(INTERVAL_KEY);
    return INTERVALS.some((i) => i.value === v) ? v : '15';
  } catch {
    return '15';
  }
}

// 报价来源：大类资产 (topic=market) 推 init_quotes/market_tick.quotes，美股 (topic=stocks) 推 init_stocks/stock_tick.stocks
const QUOTE_FEEDS = {
  market: { types: new Set(['init_quotes', 'market_tick']), field: 'quotes' },
  stocks: { types: new Set(['init_stocks', 'stock_tick']), field: 'stocks' },
};

export default function MarketKline({
  symbol: symbolProp,
  isDark,
  onNavigate,
  symbols = SYMBOLS,
  pathFor = klinePath,
  backPath = '/market-monitor',
  topic = 'market',
  notes = SYMBOL_NOTES,
}) {
  const auth = useAuth();
  const meta = symbols.find((s) => s.symbol === symbolProp) || symbols[0];
  const symbol = meta.symbol;
  const feed = QUOTE_FEEDS[topic] || QUOTE_FEEDS.market;

  const [interval, setIntervalValue] = useState(readStoredInterval);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [wsStatus, setWsStatus] = useState('connecting');
  const [legend, setLegend] = useState(null);
  const [quote, setQuote] = useState(null);
  const [hasVolume, setHasVolume] = useState(true);
  const [source, setSource] = useState('live');
  const [history, setHistory] = useState({ count: 0, earliest: null, loading: false, exhausted: false });

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volumeRef = useRef(null);
  const barsRef = useRef([]);
  const pendingRef = useRef([]);
  const loadingRef = useRef(false);
  const reqIdRef = useRef(0);
  const hoverRef = useRef(false);
  const wsRef = useRef(null);
  const quotesRef = useRef({});
  const keyRef = useRef({ symbol, interval });
  keyRef.current = { symbol, interval };
  const dateOnlyRef = useRef(DATE_ONLY_INTERVALS.has(interval));
  dateOnlyRef.current = DATE_ONLY_INTERVALS.has(interval);
  // 每次切换标的/周期递增，丢弃旧请求的翻页结果
  const genRef = useRef(0);
  const olderRef = useRef({ loading: false, exhausted: false });
  const loadOlderRef = useRef(() => {});

  const syncHistory = useCallback(() => {
    const bars = barsRef.current;
    setHistory({
      count: bars.length,
      earliest: bars.length > 0 ? bars[0].time : null,
      loading: olderRef.current.loading,
      exhausted: olderRef.current.exhausted,
    });
  }, []);

  const legendAt = useCallback((i) => {
    const bars = barsRef.current;
    if (i < 0 || i >= bars.length) return null;
    const b = bars[i];
    return { ...b, prevClose: i > 0 ? bars[i - 1].close : b.open };
  }, []);

  const applyLiveBar = useCallback(
    (raw) => {
      const candle = candleRef.current;
      const volume = volumeRef.current;
      const bars = barsRef.current;
      const n = bars.length;
      if (!candle || n === 0) return;
      const b = toChartBar(raw);
      if (b.time >= bars[n - 1].time) {
        if (b.time === bars[n - 1].time) bars[n - 1] = b;
        else bars.push(b);
        candle.update(b);
        volume.update(toVolumeBar(b));
      } else {
        let lo = 0;
        let hi = n;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (bars[mid].time < b.time) lo = mid + 1;
          else hi = mid;
        }
        if (lo < n && bars[lo].time === b.time) {
          bars[lo] = b;
          candle.update(b, true);
          volume.update(toVolumeBar(b), true);
        }
      }
      if (!hoverRef.current) setLegend(legendAt(bars.length - 1));
    },
    [legendAt]
  );

  // 只依赖 ref，WS 回调里的旧闭包调用也始终针对当前标的与周期
  const loadBars = useCallback(
    async (resetView) => {
      const id = ++reqIdRef.current;
      const { symbol: sym, interval: iv } = keyRef.current;
      loadingRef.current = true;
      if (resetView) setStatus('loading');
      try {
        const res = await crmApi.getMarketKlines(sym, iv);
        if (id !== reqIdRef.current || !candleRef.current) return;
        let bars = (res?.data?.bars || []).map(toChartBar);
        // 重拉最新数据时保留已经向左翻页加载的更早 K 线
        if (!resetView && bars.length > 0) {
          const older = barsRef.current.filter((b) => b.time < bars[0].time);
          if (older.length > 0) bars = older.concat(bars);
        }
        barsRef.current = bars;
        setSource(res?.data?.source || 'live');
        candleRef.current.setData(bars);
        volumeRef.current.setData(bars.map(toVolumeBar));
        const withVolume = bars.some((b) => b.volume > 0);
        volumeRef.current.applyOptions({ visible: withVolume });
        setHasVolume(withVolume);

        loadingRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = [];
        pending.forEach(applyLiveBar);

        if (resetView && bars.length > 0) {
          chartRef.current.timeScale().setVisibleLogicalRange({
            from: Math.max(0, bars.length - INITIAL_VISIBLE_BARS),
            to: bars.length + 4,
          });
        }
        if (!hoverRef.current) setLegend(legendAt(bars.length - 1));
        syncHistory();
        setError('');
        setStatus(bars.length > 0 ? 'ready' : 'empty');
      } catch (err) {
        if (id !== reqIdRef.current) return;
        loadingRef.current = false;
        pendingRef.current = [];
        setError(err.message || 'K 线数据加载失败');
        setStatus(barsRef.current.length > 0 ? 'ready' : 'error');
      }
    },
    [applyLiveBar, legendAt, syncHistory]
  );

  // 向左翻页：从本地归档取最早一根之前的 K 线，拼到前面并保持当前视野不跳动
  const loadOlder = useCallback(async () => {
    const state = olderRef.current;
    const bars = barsRef.current;
    if (state.loading || state.exhausted || loadingRef.current || bars.length === 0) return;
    const gen = genRef.current;
    const { symbol: sym, interval: iv } = keyRef.current;
    state.loading = true;
    syncHistory();
    try {
      const res = await crmApi.getMarketKlines(sym, iv, OLDER_PAGE_BARS, bars[0].time - BJ_OFFSET);
      if (gen !== genRef.current || !candleRef.current) return;
      const current = barsRef.current;
      const older = (res?.data?.bars || []).map(toChartBar).filter((b) => current.length === 0 || b.time < current[0].time);
      if (older.length < OLDER_PAGE_BARS) state.exhausted = true;
      if (older.length > 0) {
        const timeScale = chartRef.current.timeScale();
        const range = timeScale.getVisibleLogicalRange();
        const merged = older.concat(current);
        barsRef.current = merged;
        candleRef.current.setData(merged);
        volumeRef.current.setData(merged.map(toVolumeBar));
        if (range) timeScale.setVisibleLogicalRange({ from: range.from + older.length, to: range.to + older.length });
        if (!hoverRef.current) setLegend(legendAt(merged.length - 1));
      }
    } catch (err) {
      if (gen === genRef.current) setError(err.message || '更早的 K 线加载失败');
    } finally {
      if (gen === genRef.current) {
        state.loading = false;
        syncHistory();
      }
    }
  }, [legendAt, syncHistory]);
  loadOlderRef.current = loadOlder;

  // 1. 图表实例 (只创建一次，主题/精度变化时 applyOptions)
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      autoSize: true,
      ...themeOptions(document.documentElement.classList.contains('dark')),
      localization: {
        locale: 'zh-CN',
        timeFormatter: (t) => (dateOnlyRef.current ? formatChartDate(t) : formatChartTime(t)),
      },
    });
    chart.applyOptions({
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 4 },
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } });
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      if (param.time === undefined || param.logical === undefined) {
        hoverRef.current = false;
        setLegend(legendAt(barsRef.current.length - 1));
        return;
      }
      hoverRef.current = true;
      setLegend(legendAt(Math.round(param.logical)));
    });
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range && range.from < OLDER_TRIGGER_BARS) loadOlderRef.current();
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;
    return () => {
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      chart.remove();
    };
  }, [legendAt]);

  useEffect(() => {
    chartRef.current?.applyOptions(themeOptions(isDark));
  }, [isDark]);

  // 2. 切换标的或周期：清空旧图、重新订阅并拉取历史 K 线
  useEffect(() => {
    setLiveError('');
    setQuote(quotesRef.current[symbol] || null);
    try {
      localStorage.setItem(INTERVAL_KEY, interval);
    } catch {}

    candleRef.current?.applyOptions({
      priceFormat: { type: 'price', precision: meta.dec, minMove: 1 / 10 ** meta.dec },
    });
    chartRef.current?.applyOptions({ timeScale: { timeVisible: !DATE_ONLY_INTERVALS.has(interval) } });
    genRef.current += 1;
    olderRef.current = { loading: false, exhausted: false };
    setHistory({ count: 0, earliest: null, loading: false, exhausted: false });
    setSource('live');
    barsRef.current = [];
    pendingRef.current = [];
    hoverRef.current = false;
    setLegend(null);
    candleRef.current?.setData([]);
    volumeRef.current?.setData([]);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'kline_sub', symbol, interval }));
    }
    loadBars(true);
  }, [symbol, interval, meta.dec, loadBars]);

  // 3. 实时推送 WSS：订阅当前 K 线并接收报价快照
  useEffect(() => {
    if (!auth.token) {
      setWsStatus('disconnected');
      return undefined;
    }
    let ws = null;
    let pingTimer = null;
    let watchdogTimer = null;
    let retryTimer = null;
    let disposed = false;
    let attempts = 0;
    let everConnected = false;
    let lastMsgAt = Date.now();

    const handleMessage = (msg) => {
      const { symbol: sym, interval: iv } = keyRef.current;
      if (feed.types.has(msg.type)) {
        const list = msg[feed.field];
        if (!Array.isArray(list)) return;
        list.forEach((q) => {
          quotesRef.current[q.symbol] = q;
        });
        const current = list.find((q) => q.symbol === sym);
        if (current) setQuote({ ...current });
        return;
      }
      if (msg.symbol !== sym || String(msg.interval) !== iv) return;
      if (msg.type === 'kline' && Array.isArray(msg.bars)) {
        setLiveError('');
        if (loadingRef.current) pendingRef.current.push(...msg.bars);
        else msg.bars.forEach(applyLiveBar);
      } else if (msg.type === 'kline_reset') {
        loadBars(false);
      } else if (msg.type === 'kline_error') {
        setLiveError(msg.message || 'K 线实时订阅失败');
      }
    };

    const connect = () => {
      if (disposed) return;
      setWsStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const topicQuery = topic === 'market' ? '' : `&topic=${topic}`;
      ws = new WebSocket(
        `${protocol}//${window.location.host}/api/v1/market/ws?token=${encodeURIComponent(auth.token)}${topicQuery}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        lastMsgAt = Date.now();
        setWsStatus('connected');
        const { symbol: sym, interval: iv } = keyRef.current;
        ws.send(JSON.stringify({ type: 'kline_sub', symbol: sym, interval: iv }));
        // 断线期间可能漏掉 K 线更新，重连后补拉一次历史
        if (everConnected) loadBars(false);
        everConnected = true;
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 10000);
        watchdogTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && Date.now() - lastMsgAt > 25000) ws.close();
        }, 5000);
      };

      ws.onmessage = (event) => {
        lastMsgAt = Date.now();
        if (event.data === 'pong') return;
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        handleMessage(msg);
      };

      ws.onclose = () => {
        clearInterval(pingTimer);
        clearInterval(watchdogTimer);
        if (wsRef.current === ws) wsRef.current = null;
        if (disposed) return;
        setWsStatus('disconnected');
        attempts += 1;
        retryTimer = setTimeout(connect, Math.min(10000, 2000 * attempts));
      };
    };

    connect();

    // WSS 不可用时降级为每 20 秒 REST 补拉
    const pollTimer = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) loadBars(false);
    }, 20000);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      clearInterval(watchdogTimer);
      clearInterval(pollTimer);
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [auth.token, applyLiveBar, loadBars, feed, topic]);

  const lastBar = legendAt(barsRef.current.length - 1);
  const headPrice = quote?.price ?? lastBar?.close;
  const headChange = quote?.change;
  const headPct = quote?.changePct;
  const headUp = (headChange ?? 0) >= 0;
  const fmt = (v) => (typeof v === 'number' ? v.toFixed(meta.dec) : '-');

  const legendChange = legend ? legend.close - legend.prevClose : 0;
  const legendPct = legend && legend.prevClose ? (legendChange / legend.prevClose) * 100 : 0;
  const legendColor = legendChange >= 0 ? 'text-red-500' : 'text-green-600 dark:text-green-500';

  const wsBadge = {
    connected: { dot: 'bg-emerald-500', text: '实时推送中' },
    connecting: { dot: 'bg-amber-500 animate-pulse', text: '连接中' },
    disconnected: { dot: 'bg-zinc-400', text: '已断开，定时刷新' },
  }[wsStatus];

  return (
    <div className="space-y-4">
      {/* 顶部：返回 + 标的信息 + 周期切换 */}
      <div className="bg-white dark:bg-[#121316] p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate(backPath)}
              className="mt-0.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="返回行情监控"
            >
              <Icon name="arrow-left" className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">{meta.name}</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                  {meta.symbol}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {meta.category}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1 font-mono">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmt(headPrice)}</span>
                <span className="text-xs text-zinc-400">{meta.unit}</span>
                {typeof headChange === 'number' && (
                  <span className={`text-sm font-semibold ${headUp ? 'text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                    {headUp ? '+' : ''}
                    {headChange.toFixed(meta.dec)}
                    {typeof headPct === 'number' && ` (${headUp ? '+' : ''}${headPct.toFixed(2)}%)`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              size="sm"
              variant="filter"
              align="right"
              value={symbol}
              onChange={(v) => onNavigate(pathFor(v))}
              options={symbols.map((s) => ({ value: s.symbol, label: s.name, badge: s.category }))}
              dropdownClassName="min-w-[260px]"
            />
            <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
              {INTERVALS.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => setIntervalValue(it.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    interval === it.value
                      ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OHLC 图例：悬停时显示光标所在 K 线，否则显示最新 K 线 */}
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] font-mono text-zinc-500 min-h-[18px]">
          {legend ? (
            <>
              <span className="text-zinc-700 dark:text-zinc-300">
                {DATE_ONLY_INTERVALS.has(interval) ? formatChartDate(legend.time) : `${formatChartTime(legend.time)} 北京时间`}
              </span>
              <span>开 <strong className={legendColor}>{fmt(legend.open)}</strong></span>
              <span>高 <strong className={legendColor}>{fmt(legend.high)}</strong></span>
              <span>低 <strong className={legendColor}>{fmt(legend.low)}</strong></span>
              <span>收 <strong className={legendColor}>{fmt(legend.close)}</strong></span>
              <span className={legendColor}>
                {legendChange >= 0 ? '+' : ''}
                {legendChange.toFixed(meta.dec)} ({legendChange >= 0 ? '+' : ''}
                {legendPct.toFixed(2)}%)
              </span>
              {hasVolume && <span>量 <strong className="text-zinc-700 dark:text-zinc-300">{volumeFormatter.format(legend.volume)}</strong></span>}
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      {/* K 线图 */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-2 sm:p-3">
        <div className="relative h-[62vh] min-h-[380px]">
          <div ref={containerRef} className="absolute inset-0" />
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-[#121316]/60 z-10">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Icon name="refresh-cw" className="w-4 h-4 animate-spin text-amber-500" />
                正在从 TradingView 加载 K 线数据…
              </div>
            </div>
          )}
          {(status === 'error' || status === 'empty') && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                  <Icon name="alert-triangle" className="w-4 h-4 text-amber-500" />
                  {status === 'empty' ? '该周期暂无 K 线数据' : error}
                </div>
                <button
                  type="button"
                  onClick={() => loadBars(true)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium"
                >
                  重新加载
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-zinc-400 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${wsBadge.dot}`} />
            {wsBadge.text}
          </span>
          {liveError && <span className="text-amber-500">实时订阅异常: {liveError}</span>}
          {status === 'ready' && error && <span className="text-amber-500">刷新失败: {error}</span>}
          {source === 'archive' && <span className="text-amber-500">TradingView 暂不可用，当前显示本地归档数据</span>}
          {history.count > 0 && (
            <span>
              已加载 {history.count} 根，最早 {formatChartDate(history.earliest)}
              {history.loading ? ' · 正在加载更早数据…' : history.exhausted ? ' · 已到归档最早' : ' · 向左拖动加载更早'}
            </span>
          )}
          {notes[symbol] && <span>{notes[symbol]}</span>}
        </div>
        <span>数据来源 TradingView (历史已本地归档) · 时间为北京时间 · 红涨绿跌</span>
      </div>
    </div>
  );
}
