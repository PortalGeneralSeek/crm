import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../shared/Icon';
import { useAuth } from '../services/crmApi';
import { ImpactChips, formatNewsTime, shouldPopup, usePopupMode } from './newsImpactUi';
import { DriverChain } from './macroTransmission';

const MAX_VISIBLE = 4;
const LIFETIME_MS = 20000;
const BREAKING_LIFETIME_MS = 40000;

// 全局快讯弹窗：登录后以 topic=news 订阅后端 WSS，只接收快讯不接收行情跳价，任何页面都能弹出
export default function NewsFlashAlerts() {
  const auth = useAuth();
  const [mode] = usePopupMode();
  const modeRef = useRef(mode);
  const [alerts, setAlerts] = useState([]);
  const timersRef = useRef({});

  useEffect(() => {
    modeRef.current = mode;
    if (mode === 'off') setAlerts([]);
  }, [mode]);

  const dismiss = (id) => {
    setAlerts((list) => list.filter((a) => a.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  const schedule = (id, ms) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    timersRef.current[id] = setTimeout(() => dismiss(id), ms);
  };

  useEffect(() => {
    if (!auth.token) return undefined;
    let ws = null;
    let pingTimer = null;
    let reconnectTimer = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(
        `${protocol}//${window.location.host}/api/v1/market/ws?topic=news&token=${encodeURIComponent(auth.token)}`
      );
      ws.onopen = () => {
        // 后端读超时 60 秒，定期 ping 保活
        pingTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 20000);
      };
      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (e) {
          return;
        }
        if (msg.type !== 'news_flash' || !shouldPopup(msg.news, modeRef.current)) return;
        const news = msg.news;
        setAlerts((list) => {
          if (list.some((a) => a.id === news.id)) return list;
          const next = [news, ...list];
          next.slice(MAX_VISIBLE).forEach((old) => {
            if (timersRef.current[old.id]) {
              clearTimeout(timersRef.current[old.id]);
              delete timersRef.current[old.id];
            }
          });
          return next.slice(0, MAX_VISIBLE);
        });
        schedule(news.id, news.breaking ? BREAKING_LIFETIME_MS : LIFETIME_MS);
      };
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (disposed) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {};
    };

    connect();
    return () => {
      disposed = true;
      if (ws) ws.close();
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [auth.token]);

  useEffect(() => () => Object.values(timersRef.current).forEach(clearTimeout), []);

  if (alerts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-3 w-[min(420px,calc(100vw-2rem))] pointer-events-none">
      {alerts.map((news) => (
        <div
          key={news.id}
          onMouseEnter={() => timersRef.current[news.id] && clearTimeout(timersRef.current[news.id])}
          onMouseLeave={() => schedule(news.id, 8000)}
          className={`pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur-md p-4 bg-white/95 dark:bg-[#18191c]/95 animate-in fade-in slide-in-from-right duration-300 ${
            news.breaking ? 'border-rose-500/70 shadow-rose-500/20' : 'border-blue-500/50 shadow-blue-500/10'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold">
              <Icon name="bell" className={`w-3.5 h-3.5 ${news.breaking ? 'text-rose-500' : 'text-blue-500'}`} />
              {news.breaking && (
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white tracking-wide animate-pulse">BREAKING</span>
              )}
              {news.isUS && (
                <span className="px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  美国相关
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{news.category}</span>
              <span className="text-zinc-400 font-mono font-normal">{formatNewsTime(news.time)}</span>
            </div>
            <button
              onClick={() => dismiss(news.id)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
              title="关闭"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug hover:text-amber-600 dark:hover:text-amber-400"
          >
            {news.title}
          </a>
          <div className="mt-2.5">
            <ImpactChips impacts={news.impacts} max={6} />
          </div>
          {news.drivers?.length > 0 ? (
            <div className="mt-1.5">
              <DriverChain chain={news.drivers[0].chain} compact />
            </div>
          ) : (
            news.impacts?.length > 0 &&
            news.summary && (
              <p className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">依据: {news.summary}</p>
            )
          )}
          <div className="mt-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">FinancialJuice 实时快讯 · 规则引擎初判，仅供参考</span>
            <a href="#/market-monitor" onClick={() => dismiss(news.id)} className="text-amber-600 dark:text-amber-400 hover:underline">
              查看看板
            </a>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
