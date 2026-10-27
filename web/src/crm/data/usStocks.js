export const usStockKlinePath = (symbol) => `/us-stocks/kline/${encodeURIComponent(symbol)}`;

export const SESSION_LABELS = {
  market: { text: '盘中', tone: 'emerald' },
  pre_market: { text: '盘前', tone: 'sky' },
  post_market: { text: '盘后', tone: 'violet' },
  out_of_session: { text: '休市', tone: 'zinc' },
};

const CURRENCY_PREFIX = { USD: '$', KRW: '₩', TWD: 'NT$' };

export const priceDecimals = (q) => {
  const ps = q?.priceScale;
  if (!ps || ps <= 0) return 2;
  return Math.min(4, Math.max(0, Math.round(Math.log10(ps))));
};

export const formatPrice = (q, v = q?.price) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v === 0) return '-';
  return v.toLocaleString('en-US', { minimumFractionDigits: priceDecimals(q), maximumFractionDigits: priceDecimals(q) });
};

export const formatSigned = (v, digits = 2, suffix = '') => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}${suffix}`;
};

// 中文大数单位，带币种前缀 (市值、成交额)
export const formatBig = (v, currency = 'USD') => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return '-';
  const prefix = CURRENCY_PREFIX[currency] ?? '';
  if (v >= 1e12) return `${prefix}${(v / 1e12).toFixed(2)}万亿`;
  if (v >= 1e8) return `${prefix}${(v / 1e8).toFixed(v >= 1e10 ? 0 : 1)}亿`;
  if (v >= 1e4) return `${prefix}${(v / 1e4).toFixed(1)}万`;
  return `${prefix}${v.toFixed(0)}`;
};

// 当前价在 [low, high] 区间中的位置 (0-1)
export const rangePosition = (price, low, high) => {
  if (!(price > 0) || !(high > low)) return null;
  return Math.min(1, Math.max(0, (price - low) / (high - low)));
};

// 用 TradingView 实时美股 (非延迟、美元计价的个股) 的交易时段代表美股整体时段
export const usMarketSession = (stocks) => {
  const counts = {};
  stocks.forEach((q) => {
    if (q.currency !== 'USD' || q.delayMin > 0 || !q.session || q.group === 'index') return;
    counts[q.session] = (counts[q.session] || 0) + 1;
  });
  let best = null;
  Object.entries(counts).forEach(([k, n]) => {
    if (!best || n > counts[best]) best = k;
  });
  return best;
};

export const toneClasses = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
  zinc: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
};

// 与大类资产看板一致：绿涨红跌
export const changeColor = (v) =>
  typeof v !== 'number' || v === 0 ? 'text-zinc-500' : v > 0 ? 'text-emerald-500' : 'text-rose-500';
