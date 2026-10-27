import { useMemo, useState } from 'react';
import Icon from '../../shared/Icon';
import { relativeTime } from './newsImpactUi';
import {
  ASSET_ORDER,
  DriverChain,
  EffectArrows,
  EffectList,
  buildDriverIndex,
  detectLiveDrivers,
  effectTone,
} from './macroTransmission';

const NEWS_DRIVER_WINDOW_MS = 2 * 60 * 60 * 1000;

const VIEWS = [
  { value: 'live', label: '实时驱动', icon: 'activity' },
  { value: 'matrix', label: '传导矩阵', icon: 'layout-grid' },
  { value: 'asset', label: '按资产查看', icon: 'target' },
];

const TRIGGER_NAMES = {
  'TVC:US10Y': '美债10Y',
  'TVC:DXY': '美元指数',
  'TVC:USOIL': 'WTI原油',
  'TVC:VIX': 'VIX',
  'TVC:SPX': '标普500',
};

const fmtMove = (v, unit) => `${v >= 0 ? '+' : ''}${v.toFixed(unit === 'bp' ? 1 : 2)}${unit === 'bp' ? 'bp' : '%'}`;

function TriggerGauge({ trigger, quote }) {
  if (!quote || !(quote.price > 0)) return null;
  const move = trigger.unit === 'bp' ? (quote.change || 0) * 100 : quote.changePct || 0;
  const thr = move >= 0 ? trigger.upThr : trigger.downThr;
  const ratio = Math.min(1, Math.abs(move) / thr);
  const hit = ratio >= 1;
  return (
    <div className="min-w-[120px] flex-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800 px-2 py-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{TRIGGER_NAMES[trigger.symbol] || trigger.symbol}</span>
        <span className={`font-mono font-bold ${move >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtMove(move, trigger.unit)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${hit ? 'bg-amber-500' : move >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="mt-0.5 text-[9px] text-zinc-400 font-mono">
        {hit ? '已触发' : `阈值 ±${thr}${trigger.unit === 'bp' ? 'bp' : '%'}`}
      </div>
    </div>
  );
}

function LiveDriverCard({ live, quotes }) {
  const d = live.driver;
  const total = live.checks.length;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-bold">盘面触发</span>
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{d.title}</span>
          <span className="text-[10px] font-mono text-zinc-500">
            {TRIGGER_NAMES[live.triggerSymbol]} {fmtMove(live.move, live.unit)}
          </span>
        </div>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            total > 0 && live.confirmed / total >= 0.6
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-zinc-500/10 text-zinc-500'
          }`}
          title="其余资产日内涨跌方向与剧本一致的数量"
        >
          剧本兑现 {live.confirmed}/{total}
        </span>
      </div>
      <DriverChain chain={d.chain} compact />
      <EffectList effects={d.effects.filter((e) => e.symbol !== live.triggerSymbol)} quotes={quotes} showCheck />
      {total > 0 && live.confirmed / total < 0.5 && (
        <div className="text-[10px] text-amber-700 dark:text-amber-400">多数资产未按剧本运行，说明当前有更强的驱动在主导 (参考下方快讯驱动)。</div>
      )}
      {d.caveat && <div className="text-[10px] text-zinc-500 dark:text-zinc-400">⚠️ {d.caveat}</div>}
    </div>
  );
}

function DriverDetail({ driver, index, onSelect, quotes, liveKeys, newsCount }) {
  if (!driver) return null;
  const opposite = driver.opposite && index[driver.opposite];
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-600 dark:text-zinc-300">{driver.group}</span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{driver.title}</span>
          {liveKeys.has(driver.key) && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-bold">盘面触发中</span>}
          {newsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">近2小时快讯 {newsCount} 条</span>
          )}
        </div>
        {opposite && (
          <button
            type="button"
            onClick={() => onSelect(opposite.key)}
            className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
          >
            ⇄ 反向情景：{opposite.title}
          </button>
        )}
      </div>
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold text-zinc-600 dark:text-zinc-300">触发条件：</span>
        {driver.trigger}
      </div>
      <DriverChain chain={driver.chain} />
      <EffectList effects={driver.effects} quotes={quotes} showCheck={liveKeys.has(driver.key)} />
      {driver.caveat && (
        <div className="text-[11px] rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-1.5">⚠️ 例外与注意：{driver.caveat}</div>
      )}
    </div>
  );
}

export default function MacroTransmissionPanel({ playbook, quotes, newsList }) {
  const [view, setView] = useState('live');
  const [group, setGroup] = useState('全部');
  const [selectedKey, setSelectedKey] = useState('us_yields_down');
  const [asset, setAsset] = useState('TVC:GOLD');

  const drivers = playbook?.drivers || [];
  const index = useMemo(() => buildDriverIndex(drivers), [drivers]);
  const groups = useMemo(() => ['全部', ...Array.from(new Set(drivers.map((d) => d.group)))], [drivers]);

  const live = useMemo(() => detectLiveDrivers(playbook?.triggers, index, quotes), [playbook, index, quotes]);
  const liveKeys = useMemo(() => new Set(live.map((l) => l.driver.key)), [live]);

  // 近 2 小时快讯命中的驱动 (按命中次数排序，附最新一条快讯)
  const newsDrivers = useMemo(() => {
    const cutoff = Date.now() - NEWS_DRIVER_WINDOW_MS;
    const map = {};
    (newsList || []).forEach((n) => {
      const ts = new Date(n.time).getTime();
      if (Number.isNaN(ts) || ts < cutoff) return;
      (n.drivers || []).forEach((d) => {
        const e = map[d.key] || { key: d.key, count: 0, latest: null };
        e.count += 1;
        if (!e.latest) e.latest = n;
        map[d.key] = e;
      });
    });
    return Object.values(map)
      .filter((e) => index[e.key])
      .sort((a, b) => b.count - a.count);
  }, [newsList, index]);
  const newsCountByKey = useMemo(() => Object.fromEntries(newsDrivers.map((e) => [e.key, e.count])), [newsDrivers]);

  const matrixRows = group === '全部' ? drivers : drivers.filter((d) => d.group === group);

  const assetView = useMemo(() => {
    const bull = [];
    const bear = [];
    drivers.forEach((d) => {
      const e = d.effects.find((x) => x.symbol === asset);
      if (!e) return;
      (e.score > 0 ? bull : bear).push({ driver: d, effect: e });
    });
    const sorter = (a, b) => Math.abs(b.effect.score) - Math.abs(a.effect.score);
    return { bull: bull.sort(sorter), bear: bear.sort(sorter) };
  }, [drivers, asset]);
  const assetMeta = ASSET_ORDER.find((a) => a.symbol === asset);
  const assetLabels = asset === 'TVC:US10Y' ? ['推动收益率上行', '推动收益率下行'] : asset === 'TVC:VIX' ? ['推升波动', '压低波动'] : asset === 'FX_IDC:USDCNH' ? ['人民币承压 (USDCNH↑)', '人民币走强 (USDCNH↓)'] : ['利好 / 推动上涨', '利空 / 推动下跌'];

  const selectAndShow = (key) => {
    setSelectedKey(key);
    setView('matrix');
    setGroup('全部');
  };

  return (
    <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon name="git-branch" className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">宏观传导关系 · 事件如何影响各类资产</h3>
          {live.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">盘面触发 {live.length} 个驱动</span>
          )}
          <span className="text-[10px] text-zinc-400">{drivers.length} 个宏观情景 × 11 类资产</span>
        </div>
        <div className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-[11px]">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                view === v.value
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon name={v.icon} className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400">正在加载宏观传导剧本…</div>
      ) : view === 'live' ? (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
              盘面驱动指标 (日内涨跌，越过阈值即判定该宏观驱动正在发生，随 WSS 跳价实时刷新)
            </div>
            <div className="flex flex-wrap gap-2">
              {(playbook?.triggers || [])
                .filter((tr, i, arr) => arr.findIndex((x) => x.symbol === tr.symbol) === i)
                .map((tr) => (
                  <TriggerGauge key={tr.symbol} trigger={tr} quote={quotes?.[tr.symbol]} />
                ))}
            </div>
          </div>

          {live.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {live.map((l) => (
                <LiveDriverCard key={l.driver.key} live={l} quotes={quotes} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-3 text-[11px] text-zinc-500">
              当前美债收益率、美元、原油、VIX、美股的日内波动均未越过阈值，盘面没有单一宏观主线；可参考下方快讯驱动或切换到"传导矩阵"查看各情景。
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">近 2 小时快讯命中的宏观驱动</div>
            {newsDrivers.length === 0 ? (
              <div className="text-[11px] text-zinc-400">近 2 小时快讯未命中明确的宏观驱动。</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {newsDrivers.slice(0, 9).map((e) => {
                  const d = index[e.key];
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => selectAndShow(e.key)}
                      className="text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/60 p-2.5 space-y-1.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{d.title}</span>
                        <span className="text-[10px] font-mono text-blue-500">{e.count} 条</span>
                      </div>
                      <EffectArrows effects={d.effects} />
                      <div className="text-[10px] text-zinc-400 truncate" title={e.latest?.title}>
                        {relativeTime(e.latest?.time)} · {e.latest?.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : view === 'matrix' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`px-2 py-0.5 rounded-md text-[11px] cursor-pointer border transition-colors ${
                  group === g
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
                <tr className="text-zinc-500">
                  <th className="text-left px-2 py-1.5 font-semibold min-w-[180px]">宏观情景</th>
                  {ASSET_ORDER.map((a) => (
                    <th key={a.symbol} className="px-1 py-1.5 font-semibold text-center whitespace-nowrap">
                      {a.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((d) => {
                  const bySym = Object.fromEntries(d.effects.map((e) => [e.symbol, e]));
                  const active = liveKeys.has(d.key);
                  const nc = newsCountByKey[d.key] || 0;
                  return (
                    <tr
                      key={d.key}
                      onClick={() => setSelectedKey(d.key)}
                      className={`border-t border-zinc-100 dark:border-zinc-800/60 cursor-pointer ${
                        selectedKey === d.key ? 'bg-amber-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] text-zinc-400">{d.group}</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{d.title}</span>
                          {active && <span className="px-1 rounded bg-amber-500 text-zinc-950 text-[9px] font-bold">盘面</span>}
                          {nc > 0 && <span className="px-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-bold">快讯{nc}</span>}
                        </div>
                      </td>
                      {ASSET_ORDER.map((a) => {
                        const e = bySym[a.symbol];
                        return (
                          <td key={a.symbol} className="px-1 py-1 text-center">
                            {e ? (
                              <span
                                title={`${e.name} ${e.label}：${e.reason}`}
                                className={`inline-block min-w-[26px] px-1 py-0.5 rounded border text-[10px] font-bold ${effectTone(e.score)}`}
                              >
                                {(e.score > 0 ? '▲' : '▼').repeat(Math.abs(e.score) >= 2 ? 2 : 1)}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-3">
            <span>▲▲ / ▼▼ 强影响，▲ / ▼ 弱影响，· 无直接影响；悬停单元格查看原因，点击行查看完整传导链</span>
            <span>美债10Y 箭头表示收益率方向，USDCNH ▲ 表示人民币贬值，VIX ▲ 表示波动加剧</span>
          </div>
          <DriverDetail
            driver={index[selectedKey]}
            index={index}
            onSelect={setSelectedKey}
            quotes={quotes}
            liveKeys={liveKeys}
            newsCount={newsCountByKey[selectedKey] || 0}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {ASSET_ORDER.map((a) => (
              <button
                key={a.symbol}
                type="button"
                onClick={() => setAsset(a.symbol)}
                className={`px-2 py-0.5 rounded-md text-[11px] cursor-pointer border transition-colors ${
                  asset === a.symbol
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {a.short}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              { title: assetLabels[0], list: assetView.bull, tone: 'emerald' },
              { title: assetLabels[1], list: assetView.bear, tone: 'rose' },
            ].map((col) => (
              <div key={col.title} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
                <div className={`text-xs font-bold ${col.tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {col.tone === 'emerald' ? '▲' : '▼'} {col.title} · {assetMeta?.short} ({col.list.length})
                </div>
                {col.list.length === 0 && <div className="text-[11px] text-zinc-400">剧本中暂无此方向的情景</div>}
                {col.list.map(({ driver, effect }) => (
                  <button
                    key={driver.key}
                    type="button"
                    onClick={() => selectAndShow(driver.key)}
                    className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1 rounded border text-[10px] font-bold ${effectTone(effect.score)}`}>
                        {Math.abs(effect.score) >= 2 ? '强' : '弱'}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{driver.title}</span>
                      {liveKeys.has(driver.key) && <span className="px-1 rounded bg-amber-500 text-zinc-950 text-[9px] font-bold">盘面触发</span>}
                      {newsCountByKey[driver.key] > 0 && (
                        <span className="px-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-bold">快讯{newsCountByKey[driver.key]}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{effect.reason}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-zinc-400 leading-relaxed">
        传导关系为经典宏观框架下的一般规律 (规则引擎)，快讯资产研判、AI 研报与本面板共用同一套剧本；实际行情会受预期定价、多重驱动叠加等影响，仅供参考，不构成投资建议。
      </p>
    </div>
  );
}
