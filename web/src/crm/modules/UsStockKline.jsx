import { useCallback, useEffect, useState } from 'react';
import Icon from '../../shared/Icon';
import { crmApi } from '../services/crmApi';
import { priceDecimals, usStockKlinePath } from '../data/usStocks';
import MarketKline from './MarketKline';

// 美股 K 线复用大类资产 K 线页：标的清单来自后端 /market/stocks，报价走 topic=stocks 推送，历史同样从本地归档翻页
export default function UsStockKline({ symbol, isDark, onNavigate }) {
  const [state, setState] = useState({ symbols: null, notes: {}, error: '' });

  const load = useCallback(() => {
    setState((s) => ({ ...s, error: '' }));
    crmApi
      .getUsStocks()
      .then((res) => {
        const groups = Object.fromEntries((res?.data?.groups || []).map((g) => [g.key, g.title]));
        const stocks = res?.data?.stocks || [];
        const notes = {};
        const symbols = stocks.map((q) => {
          if (q.delayMin > 0) notes[q.symbol] = `${q.exchange || '交易所'} 匿名行情为 ${q.delayMin} 分钟延迟数据`;
          else if (q.group === 'index') notes[q.symbol] = '指数仅在美股交易时段更新';
          return {
            symbol: q.symbol,
            name: `${q.name} ${q.ticker}`,
            category: groups[q.group] || q.group,
            unit: q.currency || '',
            dec: priceDecimals(q),
          };
        });
        if (symbols.length === 0) throw new Error('美股标的清单为空');
        setState({ symbols, notes, error: '' });
      })
      .catch((err) => setState((s) => ({ ...s, error: err.message || '美股标的清单加载失败' })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!state.symbols) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-xs text-zinc-500">
        {state.error ? (
          <div className="text-center space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <Icon name="alert-triangle" className="w-4 h-4 text-amber-500" />
              {state.error}
            </div>
            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
            >
              重新加载
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-2">
            <Icon name="refresh-cw" className="w-4 h-4 animate-spin text-indigo-500" />
            正在加载美股标的…
          </span>
        )}
      </div>
    );
  }

  return (
    <MarketKline
      symbol={symbol}
      isDark={isDark}
      onNavigate={onNavigate}
      symbols={state.symbols}
      pathFor={usStockKlinePath}
      backPath="/us-stocks"
      topic="stocks"
      notes={state.notes}
    />
  );
}
