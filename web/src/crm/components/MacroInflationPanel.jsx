import { useEffect, useMemo, useState } from 'react';
import Icon from '../../shared/Icon';
import { relativeTime } from './newsImpactUi';
import { DriverChain, EffectArrows, EffectList } from './macroTransmission';

// 发布后 24 小时内用日内涨跌校验资产是否按剧本方向反应；更早的发布日内涨跌已与数据无关
const REACTION_WINDOW_MS = 24 * 60 * 60 * 1000;

const US_KEYS = [
  'US CPI YoY',
  'US Core CPI YoY',
  'US CPI MoM',
  'US Core CPI MoM',
  'US PPI YoY',
  'US Core PPI YoY',
  'US PPI MoM',
  'US Core PPI MoM',
];

const BEAT_STYLE = {
  above: { text: '高于预期', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  below: { text: '低于预期', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  inline: { text: '符合预期', cls: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30' },
};

const formatDay = (val) => {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatSchedule = (val) => {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val || '';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(/\//g, '-');
};

const untilText = (val) => {
  const t = new Date(val).getTime();
  if (Number.isNaN(t)) return '';
  const diff = t - Date.now();
  if (diff <= 0) return '即将公布';
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.round(diff / 60000))} 分钟后`;
  if (h < 48) return `${h} 小时后`;
  return `${Math.round(h / 24)} 天后`;
};

const signed = (v) => (v > 0 ? `+${v}` : `${v}`);

function BeatBadge({ beat }) {
  const s = BEAT_STYLE[beat];
  if (!s) return <span className="text-[10px] text-zinc-400">无预期值</span>;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${s.cls}`}>{s.text}</span>;
}

// 发布序列按时间从旧到新连线，最新点高亮
function Sparkline({ history, width = 120, height = 32, color = '#f59e0b' }) {
  const pts = (history || [])
    .filter((r) => typeof r.actualValue === 'number')
    .slice()
    .reverse();
  if (pts.length < 2) return <div style={{ width, height }} className="text-[10px] text-zinc-400 flex items-center">历史不足</div>;
  const vals = pts.map((r) => r.actualValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = width / (pts.length - 1);
  const coords = vals.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

const driverForRelease = (series, index) => {
  const key = series?.drivers?.[series?.latest?.beat];
  return key ? index?.[key] : null;
};

// 同一发布日的美国 CPI 或 PPI 各序列综合判断：核心口径是美联储更看重的指标，权重加倍
const summarizeUsKind = (seriesList, kind) => {
  const list = seriesList.filter((s) => s?.kind === kind && s.latest);
  if (list.length === 0) return null;
  const latestDay = list.map((s) => formatDay(s.latest.releasedAt)).sort().pop();
  const sameDay = list.filter((s) => formatDay(s.latest.releasedAt) === latestDay);
  let net = 0;
  const counts = { above: 0, below: 0, inline: 0 };
  sameDay.forEach((s) => {
    const w = s.core ? 2 : 1;
    if (s.latest.beat === 'above') net += w;
    if (s.latest.beat === 'below') net -= w;
    if (counts[s.latest.beat] !== undefined) counts[s.latest.beat] += 1;
  });
  const releasedAt = sameDay.map((s) => s.latest.releasedAt).sort().pop();
  const outcome = net > 0 ? 'above' : net < 0 ? 'below' : 'inline';
  return { kind, day: latestDay, releasedAt, counts, outcome, series: sameDay, drivers: sameDay[0]?.drivers };
};

function UsInflationImpact({ seriesByKey, upcoming, index, quotes }) {
  const usSeries = US_KEYS.map((k) => seriesByKey[k]).filter(Boolean);
  const kinds = ['CPI', 'PPI'].map((k) => summarizeUsKind(usSeries, k)).filter(Boolean);
  const next = (upcoming || []).find((u) => u.country === 'US' && US_KEYS.includes(u.series));
  const nextDrivers = next && seriesByKey[next.series]?.drivers;
  if (!index || (kinds.length === 0 && !next)) return null;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Icon name="git-branch" className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">美国 CPI / PPI → 实时监控资产影响</span>
        <span className="text-[10px] text-zinc-400">同日多项数据综合判断 (核心口径权重 ×2)；发布 24 小时内用日内涨跌校验资产反应</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {kinds.map((k) => {
          const driver = k.outcome !== 'inline' ? index[k.drivers?.[k.outcome]] : null;
          const recent = Date.now() - new Date(k.releasedAt).getTime() < REACTION_WINDOW_MS;
          return (
            <div key={k.kind} className="rounded-lg bg-white/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">美国 {k.kind}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{k.day} 发布</span>
                  <BeatBadge beat={k.outcome} />
                  {recent && <span className="text-[10px] px-1 rounded bg-amber-500 text-zinc-950 font-bold">24h 内</span>}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  高于 {k.counts.above} · 低于 {k.counts.below} · 符合 {k.counts.inline}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {k.series.map((s) => (
                  <span key={s.key} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
                    {s.label} {s.latest.actual}
                    <span className="text-zinc-400"> / 预 {s.latest.forecast}</span>
                  </span>
                ))}
              </div>
              {driver ? (
                <>
                  <DriverChain chain={driver.chain} compact />
                  <EffectList effects={driver.effects} quotes={recent ? quotes : null} showCheck={recent} compact />
                  {driver.caveat && <div className="text-[10px] text-zinc-500 dark:text-zinc-400">⚠️ {driver.caveat}</div>}
                </>
              ) : (
                <div className="text-[11px] text-zinc-500">多项数据整体符合预期 (或高低互抵)，对黄金、美元、美债、美股的方向性冲击有限，行情更多由其他驱动主导。</div>
              )}
            </div>
          );
        })}
      </div>
      {next && nextDrivers && (
        <div className="rounded-lg border border-dashed border-blue-500/40 p-2.5 space-y-2">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
            <span className="font-bold text-blue-600 dark:text-blue-400">下次发布情景推演：</span>
            美国 {next.label} · 北京时间 {formatSchedule(next.releaseAt)} ({untilText(next.releaseAt)}) · 预期 {next.forecast} / 前值 {next.previous}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              ['above', '若高于预期 (通胀偏热)'],
              ['below', '若低于预期 (通胀降温)'],
            ].map(([beat, title]) => {
              const d = index[nextDrivers[beat]];
              if (!d) return null;
              return (
                <div key={beat} className="space-y-1">
                  <div className={`text-[11px] font-semibold ${beat === 'above' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {title}
                  </div>
                  <EffectArrows effects={d.effects} max={11} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UsCard({ series, selected, fresh, onSelect, index }) {
  const r = series?.latest;
  const driver = driverForRelease(series, index);
  return (
    <button
      type="button"
      onClick={() => series && onSelect(series.key)}
      className={`text-left p-3 rounded-xl border transition-all ${
        selected
          ? 'border-amber-500 bg-amber-500/5 shadow-sm shadow-amber-500/20'
          : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 hover:border-amber-500/50'
      } ${fresh ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{series?.label || '-'}</span>
        {r && <BeatBadge beat={r.beat} />}
      </div>
      <div className="flex items-end justify-between mt-1.5">
        <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{r?.actual || '-'}</span>
        <Sparkline history={series?.history} width={84} height={28} />
      </div>
      <div className="mt-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex justify-between gap-1">
        <span>预期 {r?.forecast || '-'}</span>
        <span>前值 {r?.revised ? `${r.previous}→${r.revised}` : r?.previous || '-'}</span>
      </div>
      <div className="mt-1 text-[10px] text-zinc-400 flex justify-between gap-1">
        <span>{r ? formatDay(r.releasedAt) : '暂无数据'}</span>
        {series?.next && <span className="text-blue-500">下次 {formatSchedule(series.next.releaseAt)}</span>}
      </div>
      {driver && (
        <div className="mt-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <EffectArrows effects={driver.effects} max={6} />
        </div>
      )}
    </button>
  );
}

// 每个国家挑选概览列：同比、无附加限定词；CPI 优先于 HICP
const pickSeries = (list, { kind, core }) => {
  const cands = list.filter((s) => s.kind === kind && !!s.core === core && s.measure === 'YoY');
  const score = (s) => (s.latest ? 0 : 10) + (s.extra ? 4 : 0) + (s.key.includes('HICP') ? 2 : 0) + (s.key.startsWith('BoC') ? 1 : 0);
  return cands.sort((a, b) => score(a) - score(b))[0] || null;
};

function CountryCell({ series, selectedKey, onSelect, fresh }) {
  if (!series) return <td className="px-2 py-2 text-zinc-300 dark:text-zinc-600">—</td>;
  const r = series.latest;
  // 该国主序列缺失时会退而展示地区/替代口径 (如东京 CPI、加央行核心 CPI)，需标明来源避免误读
  const note = /^(Tokyo|BoC)\b/.test(series.key) || series.extra ? series.key : '';
  return (
    <td className="px-2 py-2">
      {note && <div className="text-[9px] font-mono text-amber-600/80 dark:text-amber-400/80 mb-0.5">{note}</div>}
      <button
        type="button"
        onClick={() => onSelect(series.key)}
        title={series.key}
        className={`text-left rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors ${
          selectedKey === series.key ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        } ${fresh ? 'ring-2 ring-amber-400' : ''}`}
      >
        {r ? (
          <>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{r.actual}</span>
            <span className="text-[10px] text-zinc-400 font-mono ml-1">预 {r.forecast} / 前 {r.previous}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <BeatBadge beat={r.beat} />
              <span className="text-[10px] text-zinc-400">{formatDay(r.releasedAt)}</span>
            </div>
          </>
        ) : (
          <span className="text-[11px] text-zinc-400">待首发 · 前值 {series.next?.previous || '-'}</span>
        )}
      </button>
    </td>
  );
}

export default function MacroInflationPanel({ macro, freshKeys = {}, loading, driverIndex, quotes }) {
  const [selectedKey, setSelectedKey] = useState('US CPI YoY');
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [, setNowTick] = useState(0);

  // 仅用于刷新 "x 小时后" 之类的相对时间文字，不请求数据
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const seriesByKey = useMemo(() => {
    const map = {};
    (macro?.countries || []).forEach((c) => c.series.forEach((s) => (map[s.key] = s)));
    return map;
  }, [macro]);

  const rows = useMemo(
    () =>
      (macro?.countries || []).map((c) => ({
        code: c.code,
        name: c.name,
        cpi: pickSeries(c.series, { kind: 'CPI', core: false }),
        core: pickSeries(c.series, { kind: 'CPI', core: true }),
        ppi: pickSeries(c.series, { kind: 'PPI', core: false }),
        next: c.series
          .map((s) => s.next)
          .filter(Boolean)
          .sort((a, b) => (a.releaseAt < b.releaseAt ? -1 : 1))[0],
      })),
    [macro]
  );

  const selected = seriesByKey[selectedKey];
  const upcoming = macro?.upcoming || [];
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, 8);
  const status = macro?.status;

  return (
    <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="line-chart" className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">全球 CPI / PPI 通胀数据监控 (FinancialJuice)</h3>
          <span className="text-[10px] text-zinc-400">美国全口径 · 各国主序列 · 发布即推送</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span
            className={`w-2 h-2 rounded-full ${
              status?.state === 'ready' ? 'bg-emerald-500' : status?.state === 'error' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span>{loading && !macro ? '加载中…' : status?.text || '等待数据'}</span>
          {status?.seriesCount > 0 && (
            <span className="font-mono">
              {status.seriesCount} 序列 / {status.releaseCount} 次发布
            </span>
          )}
        </div>
      </div>

      {/* 美国 8 项核心通胀序列 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">美国 · 通胀核心数据</span>
          <span className="text-[10px] text-zinc-400">点击卡片查看历史；卡片底部为该项数据对监控资产的影响方向 (悬停查看原因)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {US_KEYS.map((key) => (
            <UsCard
              key={key}
              series={seriesByKey[key]}
              selected={selectedKey === key}
              fresh={!!freshKeys[key]}
              onSelect={setSelectedKey}
              index={driverIndex}
            />
          ))}
        </div>
      </div>

      <UsInflationImpact seriesByKey={seriesByKey} upcoming={upcoming} index={driverIndex} quotes={quotes} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* 各国概览 */}
        <div className="xl:col-span-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-2 py-1.5 text-left font-semibold">国家/地区</th>
                <th className="px-2 py-1.5 text-left font-semibold">CPI 同比</th>
                <th className="px-2 py-1.5 text-left font-semibold">核心 CPI 同比</th>
                <th className="px-2 py-1.5 text-left font-semibold">PPI 同比</th>
                <th className="px-2 py-1.5 text-left font-semibold">下次发布</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.code}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 align-top ${row.code === 'US' ? 'bg-blue-500/5' : ''}`}
                >
                  <td className="px-2 py-2 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {row.name}
                    <span className="ml-1 text-[10px] font-mono text-zinc-400">{row.code}</span>
                  </td>
                  <CountryCell series={row.cpi} selectedKey={selectedKey} onSelect={setSelectedKey} fresh={row.cpi && freshKeys[row.cpi.key]} />
                  <CountryCell series={row.core} selectedKey={selectedKey} onSelect={setSelectedKey} fresh={row.core && freshKeys[row.core.key]} />
                  <CountryCell series={row.ppi} selectedKey={selectedKey} onSelect={setSelectedKey} fresh={row.ppi && freshKeys[row.ppi.key]} />
                  <td className="px-2 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {row.next ? (
                      <>
                        <div>{row.next.label}</div>
                        <div className="text-blue-500 font-mono">
                          {formatSchedule(row.next.releaseAt)} · {untilText(row.next.releaseAt)}
                        </div>
                      </>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">日历暂无</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-zinc-400">
                    {loading ? '正在加载各国通胀数据…' : '暂无数据，后端首次启动回补约需 2 分钟'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {/* 选中序列历史 */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {selected ? `${selected.countryName} ${selected.label}` : '选择一个序列'}
                </div>
                <div className="text-[10px] font-mono text-zinc-400">{selected?.key}</div>
              </div>
              {selected && <Sparkline history={selected.history} width={140} height={36} />}
            </div>
            {(() => {
              const d = driverForRelease(selected, driverIndex);
              if (!d) return null;
              return (
                <div className="mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 px-2 py-1.5 space-y-1">
                  <div className="text-[10px] text-zinc-500">
                    最新一期 {BEAT_STYLE[selected.latest.beat]?.text} → <span className="font-semibold text-zinc-700 dark:text-zinc-300">{d.title}</span>
                  </div>
                  <EffectArrows effects={d.effects} max={11} />
                </div>
              );
            })()}
            {selected?.history?.length > 0 ? (
              <div className="mt-2 max-h-64 overflow-y-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0 bg-white dark:bg-[#121316]">
                    <tr className="text-zinc-400 text-[10px]">
                      <th className="text-left py-1 font-semibold">发布日期</th>
                      <th className="text-right py-1 font-semibold">实际</th>
                      <th className="text-right py-1 font-semibold">预期</th>
                      <th className="text-right py-1 font-semibold">前值</th>
                      <th className="text-right py-1 font-semibold">偏差</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.history.map((r) => (
                      <tr key={`${r.releasedAt}-${r.stage || ''}`} className="border-t border-zinc-100 dark:border-zinc-800/60">
                        <td className="py-1 text-zinc-500">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 hover:underline" title={r.title}>
                              {formatDay(r.releasedAt)}
                            </a>
                          ) : (
                            formatDay(r.releasedAt)
                          )}
                          {r.stage && <span className="ml-1 text-[9px] text-zinc-400">{r.stage}</span>}
                        </td>
                        <td className="py-1 text-right font-bold text-zinc-900 dark:text-zinc-100">{r.actual}</td>
                        <td className="py-1 text-right text-zinc-500">{r.forecast}</td>
                        <td className="py-1 text-right text-zinc-500">{r.revised ? `${r.previous}→${r.revised}` : r.previous}</td>
                        <td
                          className={`py-1 text-right ${
                            r.beat === 'above' ? 'text-rose-500' : r.beat === 'below' ? 'text-emerald-500' : 'text-zinc-400'
                          }`}
                        >
                          {typeof r.surprise === 'number' ? signed(r.surprise) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-zinc-400">
                {selected?.next ? `尚无历史发布，下次发布 ${formatSchedule(selected.next.releaseAt)}` : '暂无历史数据'}
              </div>
            )}
          </div>

          {/* 发布日程 */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Icon name="calendar" className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">CPI / PPI 发布日程 (北京时间)</span>
              </div>
              {upcoming.length > 8 && (
                <button type="button" onClick={() => setShowAllUpcoming((v) => !v)} className="text-[10px] text-amber-600 hover:underline">
                  {showAllUpcoming ? '收起' : `全部 ${upcoming.length} 项`}
                </button>
              )}
            </div>
            {visibleUpcoming.length === 0 ? (
              <div className="text-[11px] text-zinc-400">经济日历暂无待发布的 CPI/PPI 事件</div>
            ) : (
              <ul className="space-y-1.5">
                {visibleUpcoming.map((u) => (
                  <li
                    key={`${u.series}-${u.stage || ''}-${u.releaseAt}`}
                    className={`flex items-center justify-between gap-2 text-[11px] rounded-md px-1.5 py-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60 ${
                      u.country === 'US' ? 'bg-blue-500/5' : ''
                    }`}
                    onClick={() => setSelectedKey(u.series)}
                    title={u.title}
                  >
                    <span className="min-w-0 truncate">
                      <span className={`font-semibold ${u.country === 'US' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {u.countryName}
                      </span>{' '}
                      <span className="text-zinc-600 dark:text-zinc-400">{u.label}</span>
                      {u.stage && <span className="ml-1 text-[9px] text-zinc-400">{u.stage}</span>}
                      {u.importance === 1 && <span className="ml-1 text-rose-500" title="高重要性">●</span>}
                    </span>
                    <span className="shrink-0 font-mono text-zinc-500 text-right">
                      <span className="text-zinc-400">预 {u.forecast} / 前 {u.previous}</span>
                      <span className="ml-2 text-blue-500">{formatSchedule(u.releaseAt)}</span>
                      <span className="ml-1 text-zinc-400">({untilText(u.releaseAt)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
        <span>数据源：FinancialJuice 数据发布快讯 + 经济日历</span>
        {status?.backfillAt && <span>历史回补：{relativeTime(status.backfillAt)}</span>}
        {status?.calendarAt && <span>日历同步：{relativeTime(status.calendarAt)}</span>}
        {status?.lastReleaseAt && <span>最近一次发布：{formatSchedule(status.lastReleaseAt)}</span>}
      </div>
    </div>
  );
}
