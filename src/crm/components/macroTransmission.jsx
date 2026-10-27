// 宏观传导剧本的前端工具：剧本数据来自 GET /api/v1/market/playbook (后端 macro_playbook.go 为唯一数据源)

export const ASSET_ORDER = [
  { symbol: 'TVC:GOLD', short: '黄金' },
  { symbol: 'TVC:SILVER', short: '白银' },
  { symbol: 'TVC:USOIL', short: 'WTI' },
  { symbol: 'TVC:UKOIL', short: '布油' },
  { symbol: 'COMEX:HG1!', short: '铜' },
  { symbol: 'TVC:DXY', short: '美元' },
  { symbol: 'TVC:US10Y', short: '美债10Y' },
  { symbol: 'FX_IDC:USDCNH', short: 'USDCNH' },
  { symbol: 'TVC:VIX', short: 'VIX' },
  { symbol: 'TVC:SPX', short: '标普' },
  { symbol: 'BINANCE:BTCUSDT', short: 'BTC' },
];

export const buildDriverIndex = (drivers) => {
  const map = {};
  (drivers || []).forEach((d) => (map[d.key] = d));
  return map;
};

// 与后端 DetectLiveDrivers 相同的判断：触发标的日内涨跌越过阈值 → 驱动成立，并校验其余资产方向
export const detectLiveDrivers = (triggers, index, quotes) => {
  const out = [];
  const seen = new Set();
  (triggers || []).forEach((tr) => {
    const q = quotes?.[tr.symbol];
    if (!q || !(q.price > 0)) return;
    const move = tr.unit === 'bp' ? (q.change || 0) * 100 : q.changePct || 0;
    let key = '';
    if (move >= tr.upThr) key = tr.up;
    else if (move <= -tr.downThr) key = tr.down;
    if (!key || seen.has(key) || !index[key]) return;
    seen.add(key);
    const d = index[key];
    const checks = d.effects
      .filter((e) => e.symbol !== tr.symbol && quotes[e.symbol]?.price > 0)
      .map((e) => {
        const chg = quotes[e.symbol].changePct || 0;
        return { ...e, changePct: chg, match: (e.score > 0 && chg > 0) || (e.score < 0 && chg < 0) };
      });
    out.push({
      driver: d,
      triggerSymbol: tr.symbol,
      move,
      unit: tr.unit,
      threshold: move > 0 ? tr.upThr : tr.downThr,
      checks,
      confirmed: checks.filter((c) => c.match).length,
    });
  });
  return out;
};

// 资产在剧本中的方向 (US10Y 为收益率、USDCNH 上行即人民币贬值)
export const effectTone = (score) =>
  score > 0
    ? score >= 2
      ? 'bg-emerald-500 text-white border-emerald-500'
      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    : score <= -2
    ? 'bg-rose-500 text-white border-rose-500'
    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';

export function DriverChain({ chain, compact = false }) {
  if (!Array.isArray(chain) || chain.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      {chain.map((step, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-amber-500 font-bold">→</span>}
          <span
            className={`px-1.5 py-0.5 rounded ${
              i === 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            {step}
          </span>
        </span>
      ))}
    </div>
  );
}

// 剧本中各资产的方向；quotes 存在时附带日内涨跌与 "是否按剧本方向运行"
export function EffectList({ effects, quotes, showCheck = false, compact = false }) {
  if (!Array.isArray(effects) || effects.length === 0) return null;
  return (
    <div className={`grid gap-1 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {effects.map((e) => {
        const q = quotes?.[e.symbol];
        const chg = q?.changePct;
        const hasChg = typeof chg === 'number';
        const match = hasChg && ((e.score > 0 && chg > 0) || (e.score < 0 && chg < 0));
        return (
          <div key={e.symbol} className="flex items-start gap-1.5 text-[11px] leading-snug">
            <span className={`shrink-0 px-1.5 py-0.5 rounded border font-bold text-[10px] ${effectTone(e.score)}`}>
              {e.score > 0 ? '▲' : '▼'} {e.name}
            </span>
            <span className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-400">
              <span className={`font-semibold ${e.score > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {e.label}
              </span>
              <span className="text-zinc-400"> · </span>
              {e.reason}
            </span>
            {showCheck && hasChg && (
              <span
                className={`shrink-0 font-mono text-[10px] ${match ? 'text-emerald-500' : 'text-zinc-400'}`}
                title={match ? '日内走势与剧本方向一致' : '日内走势与剧本方向不一致'}
              >
                {chg >= 0 ? '+' : ''}
                {chg.toFixed(2)}% {match ? '✓' : '✗'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 紧凑版：只显示资产名 + 箭头，悬停看原因
export function EffectArrows({ effects, max = 8 }) {
  if (!Array.isArray(effects) || effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {effects.slice(0, max).map((e) => (
        <span
          key={e.symbol}
          title={`${e.name} ${e.label}：${e.reason}`}
          className={`px-1 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap ${effectTone(e.score)}`}
        >
          {e.score > 0 ? '▲' : '▼'}
          {e.name}
        </span>
      ))}
    </div>
  );
}
