import { useEffect, useState } from 'react';

// 快讯弹窗模式：all = 美国相关 + 突发；impact = 仅有资产影响的美国相关/突发；off = 关闭
export const POPUP_MODE_KEY = 'acme_crm_fj_popup_mode';
const POPUP_MODE_EVENT = 'acme-fj-popup-mode';

export const POPUP_MODES = [
  { value: 'all', label: '美国+突发' },
  { value: 'impact', label: '仅有资产影响' },
  { value: 'off', label: '关闭弹窗' },
];

const readPopupMode = () => {
  try {
    const v = localStorage.getItem(POPUP_MODE_KEY);
    if (POPUP_MODES.some((m) => m.value === v)) return v;
  } catch (e) {}
  return 'all';
};

export function usePopupMode() {
  const [mode, setModeState] = useState(readPopupMode);
  useEffect(() => {
    const sync = () => setModeState(readPopupMode());
    window.addEventListener(POPUP_MODE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(POPUP_MODE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const setMode = (v) => {
    try {
      localStorage.setItem(POPUP_MODE_KEY, v);
    } catch (e) {}
    setModeState(v);
    window.dispatchEvent(new Event(POPUP_MODE_EVENT));
  };
  return [mode, setMode];
}

export const shouldPopup = (news, mode) => {
  if (!news || !news.alert || mode === 'off') return false;
  if (mode === 'impact') return Array.isArray(news.impacts) && news.impacts.length > 0;
  return true;
};

export function ImpactChip({ impact, compact = false }) {
  const bull = impact.direction === 'bullish';
  return (
    <span
      title={impact.reason}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border font-semibold whitespace-nowrap ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${
        bull
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      }`}
    >
      <span>{bull ? '▲' : '▼'}</span>
      <span>{impact.name}</span>
      <span className="opacity-80">{impact.label}</span>
    </span>
  );
}

export function ImpactChips({ impacts, max = 6, compact = false }) {
  if (!Array.isArray(impacts) || impacts.length === 0) {
    return (
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500`}>
        中性 / 待观察
      </span>
    );
  }
  const shown = impacts.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((im) => (
        <ImpactChip key={im.symbol} impact={im} compact={compact} />
      ))}
      {impacts.length > max && (
        <span className="text-[10px] text-zinc-400 self-center">+{impacts.length - max}</span>
      )}
    </div>
  );
}

export const formatNewsTime = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(/\//g, '-');
};

export const relativeTime = (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}秒前`;
  if (sec < 3600) return `${Math.floor(sec / 60)}分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}小时前`;
  return `${Math.floor(sec / 86400)}天前`;
};
