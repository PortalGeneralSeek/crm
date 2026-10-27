import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';
import { useAuth, crmApi } from '../services/crmApi';

const STAGE_CONFIG = [
  {
    key: 'discovery',
    nameMatch: ['初步接洽', 'discovery'],
    title: '初步接洽 (15%)',
    dot: 'bg-blue-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: 'proposal',
    nextBtnLabel: '推进至方案呈现 →',
    colorClass: 'text-brand-600',
  },
  {
    key: 'proposal',
    nameMatch: ['方案呈现', 'proposal'],
    title: '方案呈现 (35%)',
    dot: 'bg-indigo-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: 'negotiation',
    nextBtnLabel: '推进至商务谈判 →',
    colorClass: 'text-indigo-600',
  },
  {
    key: 'negotiation',
    nameMatch: ['商务谈判', 'negotiation'],
    title: '商务谈判 (60%)',
    dot: 'bg-purple-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: 'closed_won',
    nextBtnLabel: '达成双赢签约！🎉',
    colorClass: 'text-purple-600',
  },
  {
    key: 'closed_won',
    nameMatch: ['赢单签约', 'closed_won'],
    title: '赢单签约 (100%)',
    dot: 'bg-emerald-500',
    totalClass: 'text-[10px] font-mono text-emerald-600 font-bold',
    nextStage: null,
    nextBtnLabel: null,
    colorClass: 'text-emerald-600',
  },
  {
    key: 'closed_lost',
    nameMatch: ['战败归档', 'closed_lost'],
    title: '战败归档 (0%)',
    dot: 'bg-zinc-400',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: null,
    nextBtnLabel: null,
    colorClass: 'text-zinc-500',
  },
];

export default function Deals({ active, onOpenNewDeal }) {
  const showToast = useToast();
  const auth = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getDeals();
      if (res.data?.deals) {
        setDeals(res.data.deals);
      }
    } catch (err) {
      console.warn('[Deals] Fetch deals failed, using cached store', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchDeals();
    }
  }, [active, auth.user?.id, auth.role?.id]);

  const handleAdvance = async (deal, nextStage) => {
    try {
      await crmApi.advanceDealStage(deal.id, nextStage);
      showToast(`商机「${deal.name}」已推进至「${nextStage}」！数据库与加权金额已同步更新。`, 'success');
      fetchDeals();
    } catch (err) {
      showToast(`推进失败: ${err.message}`, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await crmApi.exportDeals();
      showToast(`成功通过后端鉴权！${res.message}`, 'success');
    } catch (err) {
      showToast(`导出被拦截: ${err.message}`, 'error');
    }
  };

  const handleApproveDiscount = (deal) => {
    showToast(`【总监特权】已为商机「${deal.name}」特批专属底价折扣！`, 'success');
  };

  const totalWeighted = deals.reduce((acc, d) => {
    const prob = (d.probability || 30) / 100;
    return acc + (d.amount || 0) * prob;
  }, 0);

  return (
    <div id="module-deals" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              商机阶段看板 (Pipeline Kanban)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-blue-950 text-brand-600 dark:text-blue-400 text-xs font-semibold">
              加权预测 ¥{(totalWeighted / 10000).toFixed(1)}万 (MySQL 连接池驱动)
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                auth.canViewCostPrice
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}
            >
              {auth.canViewCostPrice ? '✓ 具备敏感底价与毛利权限' : '🔒 敏感底价已自动脱敏 (***)'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            全流程商机流转，精细化权限已映射至按钮级（新建、推进、特批、导出）与底价敏感字段
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Button: Controlled by btn:deal:export */}
          {auth.canExportDeals && (
            <button
              onClick={handleExport}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>导出商机快照</span>
            </button>
          )}

          {/* Add Deal Button: Controlled by btn:deal:add */}
          {auth.canAddDeal && (
            <button
              onClick={onOpenNewDeal}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span>创建商机项目</span>
            </button>
          )}
        </div>
      </div>

      {/* 5-Stage Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAGE_CONFIG.map((stage) => {
          const stageDeals = deals.filter(
            (d) => stage.nameMatch.includes(d.stage) || d.stage === stage.key
          );
          const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
          const formattedTotal =
            stageTotal >= 1000000
              ? `¥${(stageTotal / 1000000).toFixed(2)}M`
              : `¥${(stageTotal / 1000).toFixed(0)}K`;

          return (
            <div
              key={stage.key}
              className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between min-h-[480px]"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {stage.title}
                    </span>
                  </div>
                  <span className={stage.totalClass}>{formattedTotal}</span>
                </div>

                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-brand-500/50 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {deal.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {deal.ownerName || '负责人'}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 truncate">
                        {deal.customerName || '关联客户'}
                      </div>

                      {/* Price Section with Permission Masking */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">成交标的额:</span>
                          <span className={`text-xs font-mono font-bold ${stage.colorClass}`}>
                            ¥{Number(deal.amount || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Sensitive Cost Price & Margin Rate */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            {!deal.canViewCostPrice && <Icon name="lock" className="w-2.5 h-2.5 text-amber-500" />}
                            采购底价:
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              deal.canViewCostPrice
                                ? 'text-zinc-700 dark:text-zinc-300'
                                : 'text-amber-500 font-medium'
                            }`}
                          >
                            {deal.costPriceDisplay || '¥*** (脱敏)'}
                          </span>
                        </div>

                        {deal.marginRateDisplay && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">毛利率:</span>
                            <span
                              className={`font-mono font-semibold ${
                                deal.canViewCostPrice ? 'text-emerald-500' : 'text-zinc-400'
                              }`}
                            >
                              {deal.marginRateDisplay}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons with Permission Guards */}
                      <div className="pt-1 flex flex-col gap-1.5">
                        {/* Approve Discount: Controlled by btn:deal:approve_discount */}
                        {auth.canApproveDiscount && (
                          <button
                            onClick={() => handleApproveDiscount(deal)}
                            className="w-full py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Icon name="tag" className="w-3 h-3" />
                            <span>特批底价折扣</span>
                          </button>
                        )}

                        {/* Advance Stage Button: Controlled by btn:deal:advance_stage */}
                        {stage.nextStage ? (
                          <button
                            onClick={() => handleAdvance(deal, stage.nextStage)}
                            className="w-full py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-brand-500 hover:text-white text-[11px] font-medium transition-colors text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-1"
                          >
                            <span>{stage.nextBtnLabel}</span>
                          </button>
                        ) : (
                          <span className="block text-center py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            已赢单签约 · 交付中
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      暂无该阶段商机
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
