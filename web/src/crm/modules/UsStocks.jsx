import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { crmApi, useAuth } from '../services/crmApi';
import {
  SESSION_LABELS,
  changeColor,
  formatBig,
  formatPrice,
  formatSigned,
  rangePosition,
  toneClasses,
  usMarketSession,
  usStockKlinePath,
} from '../data/usStocks';

const FLASH_MS = 900;
const SORTS = [
  { value: 'default', label: '默认排序' },
  { value: 'chg_desc', label: '涨幅从高到低' },
  { value: 'chg_asc', label: '跌幅从高到低' },
  { value: 'cap', label: '市值从大到小' },
  { value: 'turnover', label: '成交额从大到小' },
];

const clock = (tz) =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(
    new Date()
  );

// 订阅 topic=stocks 的 WSS：连接即收到 init_stocks 全量快照，之后为 stock_tick 增量 (每 15 秒补一帧全量)；不做 HTTP 轮询
function useUsStockFeed(token) {
  const [groups, setGroups] = useState([]);
  const [stocks, setStocks] = useState({});
  const [status, setStatus] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [flash, setFlash] = useState({});
  const [ticks, setTicks] = useState(0);
  const [lastTick, setLastTick] = useState('');
  const flashTimers = useRef({});
  const stocksRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    crmApi
      .getUsStocks()
      .then((res) => {
        if (cancelled || !res?.data || Object.keys(stocksRef.current).length > 0) return;
        const map = {};
        (res.data.stocks || []).forEach((q) => {
          map[q.symbol] = q;
        });
        stocksRef.current = map;
        setStocks(map);
        setGroups(res.data.groups || []);
        setStatus(res.data.status || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setWsStatus('disconnected');
      return undefined;
    }
    let ws = null;
    let pingTimer = null;
    let watchdog = null;
    let retryTimer = null;
    let disposed = false;
    let attempts = 0;
    let lastMsgAt = Date.now();

    const merge = (list, replace) => {
      const prev = stocksRef.current;
      const next = replace ? {} : { ...prev };
      const flashes = {};
      list.forEach((q) => {
        const old = prev[q.symbol];
        if (old && old.price > 0 && q.price > 0 && q.price !== old.price) {
          flashes[q.symbol] = q.price > old.price ? 'up' : 'down';
        }
        next[q.symbol] = q;
      });
      if (replace) {
        Object.keys(prev).forEach((k) => {
          if (!next[k]) next[k] = prev[k];
        });
      }
      stocksRef.current = next;
      setStocks(next);
      const changed = Object.keys(flashes);
      if (changed.length > 0) {
        setTicks((n) => n + changed.length);
        setFlash((f) => ({ ...f, ...flashes }));
        changed.forEach((sym) => {
          clearTimeout(flashTimers.current[sym]);
          flashTimers.current[sym] = setTimeout(() => {
            setFlash((f) => {
              const { [sym]: _drop, ...rest } = f;
              return rest;
            });
          }, FLASH_MS);
        });
      }
    };

    const connect = () => {
      if (disposed) return;
      setWsStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/market/ws?token=${encodeURIComponent(token)}&topic=stocks`);
      ws.onopen = () => {
        attempts = 0;
        lastMsgAt = Date.now();
        setWsStatus('connected');
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 10000);
        watchdog = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && Date.now() - lastMsgAt > 30000) ws.close();
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
        if (msg.type === 'init_stocks') {
          if (Array.isArray(msg.groups)) setGroups(msg.groups);
          merge(msg.stocks || [], true);
          setStatus(msg.status || null);
          setLastTick(msg.timestamp || '');
        } else if (msg.type === 'stock_tick') {
          merge(msg.stocks || [], !!msg.full);
          setStatus(msg.status || null);
          setLastTick(msg.timestamp || '');
        }
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        clearInterval(watchdog);
        if (disposed) return;
        setWsStatus('disconnected');
        attempts += 1;
        retryTimer = setTimeout(connect, Math.min(15000, 2000 * attempts));
      };
    };
    connect();

    const timers = flashTimers.current;
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      clearInterval(watchdog);
      Object.values(timers).forEach(clearTimeout);
      if (ws) ws.close();
    };
  }, [token]);

  return { groups, stocks, status, wsStatus, flash, ticks, lastTick };
}

function RangeBar({ q, low, high, label }) {
  const pos = rangePosition(q.price, low, high);
  if (pos === null) return <span className="text-zinc-400">-</span>;
  return (
    <div className="w-28" title={`${label}: ${formatPrice(q, low)} - ${formatPrice(q, high)}`}>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-rose-500/40 via-zinc-300 dark:via-zinc-600 to-emerald-500/40">
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-900 dark:bg-white ring-2 ring-white dark:ring-zinc-900"
          style={{ left: `${pos * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-zinc-400 mt-0.5 font-mono">
        <span>{formatPrice(q, low)}</span>
        <span>{formatPrice(q, high)}</span>
      </div>
    </div>
  );
}

function SessionBadge({ session, delayMin }) {
  if (delayMin > 0) {
    return (
      <span className={`text-[9px] px-1 py-0.5 rounded border ${toneClasses.amber}`} title="匿名行情源为交易所延迟数据">
        延迟{delayMin}分
      </span>
    );
  }
  const s = SESSION_LABELS[session];
  if (!s) return null;
  return <span className={`text-[9px] px-1 py-0.5 rounded border ${toneClasses[s.tone]}`}>{s.text}</span>;
}

function ExtHours({ q }) {
  if (!(q.extPrice > 0)) return <span className="text-zinc-400">-</span>;
  const label = q.session === 'pre_market' ? '盘前' : '盘后';
  return (
    <div className="leading-tight">
      <div className="text-zinc-700 dark:text-zinc-300">
        <span className="text-[9px] text-zinc-400 mr-1 font-sans">{label}</span>
        {formatPrice(q, q.extPrice)}
      </div>
      <div className={`text-[10px] ${changeColor(q.extChangePct)}`}>{formatSigned(q.extChangePct, 2, '%')}</div>
    </div>
  );
}

function IndexCard({ q, flash }) {
  const border =
    flash === 'up'
      ? 'border-emerald-500 bg-emerald-500/10'
      : flash === 'down'
      ? 'border-rose-500 bg-rose-500/10'
      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121316]';
  return (
    <a
      href={`#${usStockKlinePath(q.symbol)}`}
      className={`block p-4 rounded-2xl border shadow-xs transition-all duration-300 hover:border-indigo-400 ${border}`}
    >
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
        <span className="font-medium">{q.name}</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{q.ticker}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{formatPrice(q)}</span>
        <span className={`font-mono font-semibold text-sm ${changeColor(q.changePct)}`}>{formatSigned(q.changePct, 2, '%')}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 font-mono">
        <span>{q.tag}</span>
        <span className={changeColor(q.change)}>{formatSigned(q.change, 2)}</span>
      </div>
    </a>
  );
}

function SectorCard({ group, members, selected, onSelect }) {
  const live = members.filter((q) => q.price > 0);
  const avg = live.length ? live.reduce((s, q) => s + (q.changePct || 0), 0) / live.length : null;
  const up = live.filter((q) => q.changePct > 0).length;
  const down = live.filter((q) => q.changePct < 0).length;
  const sorted = [...live].sort((a, b) => b.changePct - a.changePct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const intensity = avg === null ? 0 : Math.min(1, Math.abs(avg) / 4);
  const bg =
    avg === null
      ? undefined
      : avg >= 0
      ? `rgba(16, 185, 129, ${0.06 + intensity * 0.22})`
      : `rgba(244, 63, 94, ${0.06 + intensity * 0.22})`;
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? 'all' : group.key)}
      style={{ backgroundColor: bg }}
      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400'
      }`}
      title={group.desc}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{group.title}</span>
        <span className="text-[10px] text-zinc-400">{members.length} 只</span>
      </div>
      <div className={`text-xl font-bold font-mono mt-1 ${changeColor(avg)}`}>
        {avg === null ? '-' : formatSigned(avg, 2, '%')}
      </div>
      <div className="flex items-center gap-2 text-[10px] mt-1 font-mono">
        <span className="text-emerald-500">涨 {up}</span>
        <span className="text-rose-500">跌 {down}</span>
        <span className="text-zinc-400 font-sans">等权平均</span>
      </div>
      {best && worst && (
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 space-y-0.5 truncate">
          <div className="truncate">
            领涨 {best.name} <span className={changeColor(best.changePct)}>{formatSigned(best.changePct, 2, '%')}</span>
          </div>
          {worst !== best && (
            <div className="truncate">
              领跌 {worst.name} <span className={changeColor(worst.changePct)}>{formatSigned(worst.changePct, 2, '%')}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function MoversCard({ title, icon, list }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <Icon name={icon} className="w-4 h-4 text-indigo-500" />
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {list.length === 0 && <div className="text-xs text-zinc-400">等待行情数据…</div>}
        {list.map((q, i) => (
          <a
            key={q.symbol}
            href={`#${usStockKlinePath(q.symbol)}`}
            className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-4 text-zinc-400 font-mono">{i + 1}</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{q.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono">{q.ticker}</span>
            </span>
            <span className="flex items-center gap-3 font-mono shrink-0">
              <span className="text-zinc-600 dark:text-zinc-300">{formatPrice(q)}</span>
              <span className={`w-16 text-right font-semibold ${changeColor(q.changePct)}`}>{formatSigned(q.changePct, 2, '%')}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function UsStocks({ active }) {
  const auth = useAuth();
  const { groups, stocks, status, wsStatus, flash, ticks, lastTick } = useUsStockFeed(auth.token);
  const [groupFilter, setGroupFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [keyword, setKeyword] = useState('');
  const [clocks, setClocks] = useState(() => ({ ny: clock('America/New_York'), bj: clock('Asia/Shanghai') }));

  useEffect(() => {
    const t = setInterval(() => setClocks({ ny: clock('America/New_York'), bj: clock('Asia/Shanghai') }), 1000);
    return () => clearInterval(t);
  }, []);

  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.key, g])), [groups]);
  // stocks 按后端下发顺序插入，即为默认排序
  const ordered = useMemo(() => Object.values(stocks), [stocks]);
  const all = ordered;

  const indices = ordered.filter((q) => q.group === 'index');
  const equities = ordered.filter((q) => q.group !== 'index');
  const session = usMarketSession(ordered);
  const sessionInfo = SESSION_LABELS[session];

  const movers = useMemo(() => {
    const live = equities.filter((q) => q.price > 0 && typeof q.changePct === 'number');
    const byChg = [...live].sort((a, b) => b.changePct - a.changePct);
    return { gainers: byChg.slice(0, 6), losers: byChg.slice(-6).reverse() };
  }, [equities]);

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let list = ordered.filter((q) => groupFilter === 'all' || q.group === groupFilter);
    if (kw) {
      list = list.filter((q) =>
        [q.name, q.ticker, q.symbol, q.tag, q.description].some((s) => (s || '').toLowerCase().includes(kw))
      );
    }
    const turnover = (q) => (q.price || 0) * (q.volume || 0);
    const usdOnly = (q, v) => (q.currency === 'USD' ? v : -1);
    switch (sort) {
      case 'chg_desc':
        return [...list].sort((a, b) => (b.changePct || 0) - (a.changePct || 0));
      case 'chg_asc':
        return [...list].sort((a, b) => (a.changePct || 0) - (b.changePct || 0));
      case 'cap':
        return [...list].sort((a, b) => usdOnly(b, b.marketCap || 0) - usdOnly(a, a.marketCap || 0));
      case 'turnover':
        return [...list].sort((a, b) => usdOnly(b, turnover(b)) - usdOnly(a, turnover(a)));
      default:
        return list;
    }
  }, [ordered, groupFilter, sort, keyword]);

  const wsBadge = {
    connected: { cls: toneClasses.emerald, dot: 'bg-emerald-500 animate-pulse', text: 'WSS 实时推送中' },
    connecting: { cls: toneClasses.amber, dot: 'bg-amber-500 animate-pulse', text: '连接中…' },
    disconnected: { cls: toneClasses.amber, dot: 'bg-zinc-400', text: '已断开，自动重连中' },
  }[wsStatus];

  const groupOptions = [{ value: 'all', label: '全部板块' }, ...groups.map((g) => ({ value: g.key, label: g.title }))];

  return (
    <div id="module-us-stocks" className={`crm-module ${active ? '' : 'hidden '}space-y-6 pb-12`}>
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 p-6 rounded-2xl border border-indigo-500/20 dark:border-indigo-500/30 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Icon name="cpu" className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">美股核心科技股实时监控</h2>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${wsBadge.cls}`}>
              <span className={`w-2 h-2 rounded-full ${wsBadge.dot}`} />
              {wsBadge.text}
            </span>
            {sessionInfo && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${toneClasses[sessionInfo.tone]}`}>
                美股{sessionInfo.text}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20 font-mono">
              TradingView 实时
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-3xl leading-relaxed">
            覆盖 AI 算力、存储、光通信、半导体设备、EDA、模拟芯片、AI 服务器、电力能源、软件、网络安全、科技巨头与中概科技等产业链核心标的，后端独立 TradingView 长连接逐笔接收，每 500ms 合并推送到页面，最新报价与历史 K
            线同时保存到数据库。美股为实时行情；SK 海力士、三星电子 (韩股) 与台积电台股为交易所延迟行情。点击任意标的查看 K 线。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0 text-xs font-mono">
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-sans">美东时间</div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{clocks.ny}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-sans">北京时间</div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{clocks.bj}</div>
          </div>
          <div className="col-span-2 text-[10px] text-zinc-400 flex items-center justify-between gap-2">
            <span>
              已就绪 {status?.ready ?? 0}/{status?.symbols ?? all.length}
            </span>
            <span>
              跳价 {ticks} · {lastTick || '--:--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 指数 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indices.map((q) => (
          <IndexCard key={q.symbol} q={q} flash={flash[q.symbol]} />
        ))}
      </div>

      {/* 3. 板块热度 + 领涨领跌 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#121316] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name="layout-grid" className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">产业链板块热度</h3>
              <span className="text-[10px] text-zinc-400">点击板块筛选下方列表</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups
              .filter((g) => g.key !== 'index')
              .map((g) => (
                <SectorCard
                  key={g.key}
                  group={g}
                  members={equities.filter((q) => q.group === g.key)}
                  selected={groupFilter === g.key}
                  onSelect={setGroupFilter}
                />
              ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          <MoversCard title="领涨榜" icon="trending-up" list={movers.gainers} />
          <MoversCard title="领跌榜" icon="trending-down" list={movers.losers} />
        </div>
      </div>

      {/* 4. 明细表 */}
      <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon name="activity" className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">个股实时行情</h3>
            <span className="text-[10px] text-zinc-400">{rows.length} 只 · 绿涨红跌 · 跳价闪烁</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Icon name="search" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称 / 代码"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 w-40 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Select size="sm" variant="filter" value={groupFilter} onChange={setGroupFilter} options={groupOptions} />
            <Select size="sm" variant="filter" align="right" value={sort} onChange={setSort} options={SORTS} />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar -mx-2">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left font-semibold px-2 py-2">名称</th>
                <th className="text-right font-semibold px-2 py-2">最新价</th>
                <th className="text-right font-semibold px-2 py-2">涨跌幅</th>
                <th className="text-right font-semibold px-2 py-2">盘前/盘后</th>
                <th className="text-left font-semibold px-2 py-2 hidden md:table-cell">今日区间</th>
                <th className="text-left font-semibold px-2 py-2 hidden lg:table-cell">52 周区间</th>
                <th className="text-right font-semibold px-2 py-2">成交额</th>
                <th className="text-right font-semibold px-2 py-2 hidden md:table-cell">市值</th>
                <th className="text-right font-semibold px-2 py-2 hidden lg:table-cell">市盈率</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-zinc-400">
                    {all.length === 0 ? '正在连接 TradingView 行情…' : '没有匹配的标的'}
                  </td>
                </tr>
              )}
              {rows.map((q) => {
                const f = flash[q.symbol];
                const rowFlash = f === 'up' ? 'bg-emerald-500/10' : f === 'down' ? 'bg-rose-500/10' : '';
                const turnover = q.price > 0 && q.volume > 0 ? q.price * q.volume : 0;
                return (
                  <tr
                    key={q.symbol}
                    className={`border-b border-zinc-100 dark:border-zinc-800/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors duration-300 ${rowFlash}`}
                  >
                    <td className="px-2 py-2.5">
                      <a href={`#${usStockKlinePath(q.symbol)}`} className="group flex flex-col min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:underline underline-offset-2">
                            {q.name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">{q.ticker}</span>
                          <SessionBadge session={q.session} delayMin={q.delayMin} />
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate max-w-[240px]">
                          {groupMap[q.group]?.title} · {q.tag}
                        </span>
                      </a>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      <span className="inline-flex items-center gap-1">
                        {f === 'up' && <span className="text-emerald-500 text-[9px]">▲</span>}
                        {f === 'down' && <span className="text-rose-500 text-[9px]">▼</span>}
                        {formatPrice(q)}
                      </span>
                      {q.currency && q.currency !== 'USD' && <div className="text-[9px] text-zinc-400 font-normal">{q.currency}</div>}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-mono ${changeColor(q.changePct)}`}>
                      <div className="font-semibold">{formatSigned(q.changePct, 2, '%')}</div>
                      <div className="text-[10px] opacity-80">
                        {q.price > 0 ? formatSigned(q.change, q.priceScale === 1 ? 0 : 2) : '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">
                      <ExtHours q={q} />
                    </td>
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      <RangeBar q={q} low={q.low} high={q.high} label="今日区间" />
                    </td>
                    <td className="px-2 py-2.5 hidden lg:table-cell">
                      <RangeBar q={q} low={q.low52} high={q.high52} label="52 周区间" />
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-zinc-600 dark:text-zinc-300">
                      {formatBig(turnover, q.currency)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-zinc-600 dark:text-zinc-300 hidden md:table-cell">
                      {formatBig(q.marketCap, q.currency)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">
                      {q.pe > 0 ? q.pe.toFixed(1) : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <a
                        href={`#${usStockKlinePath(q.symbol)}`}
                        title={`查看 ${q.name} K 线`}
                        className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10"
                      >
                        <Icon name="candlestick-chart" className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-zinc-400 flex items-center justify-between flex-wrap gap-2">
          <span>成交额 = 最新价 × 当日成交量 (估算)；市值与市盈率来自 TradingView 基本面字段；韩股/台股以本币计价。</span>
          <span>数据流状态: {status?.connected ? 'TradingView 已连接' : 'TradingView 重连中'}</span>
        </div>
      </div>
    </div>
  );
}
