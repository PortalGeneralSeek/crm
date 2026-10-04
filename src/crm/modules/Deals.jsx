import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';
import { useCrmStore, crmStore } from '../store/crmStore';

const STAGE_CONFIG = [
  {
    key: '初步接洽',
    title: '初步接洽 (15%)',
    dot: 'bg-blue-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: '方案呈现',
    nextBtnLabel: '推进至方案呈现 →',
    colorClass: 'text-brand-600',
  },
  {
    key: '方案呈现',
    title: '方案呈现 (35%)',
    dot: 'bg-indigo-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: '商务谈判',
    nextBtnLabel: '推进至商务谈判 →',
    colorClass: 'text-indigo-600',
  },
  {
    key: '商务谈判',
    title: '商务谈判 (60%)',
    dot: 'bg-purple-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: '合同审批',
    nextBtnLabel: '推进至合同审批 →',
    colorClass: 'text-purple-600',
  },
  {
    key: '合同审批',
    title: '合同审批 (85%)',
    dot: 'bg-amber-500',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    nextStage: '赢单签约',
    nextBtnLabel: '双方盖章赢单！🎉',
    colorClass: 'text-amber-600',
  },
  {
    key: '赢单签约',
    title: '赢单签约 (100%)',
    dot: 'bg-emerald-500',
    totalClass: 'text-[10px] font-mono text-emerald-600 font-bold',
    nextStage: null,
    nextBtnLabel: null,
    colorClass: 'text-emerald-600',
  },
];

export default function Deals({ active, onOpenNewDeal }) {
  const showToast = useToast();
  const { deals } = useCrmStore();

  const handleAdvance = (deal, nextStage) => {
    crmStore.updateDealStage(deal.id, nextStage);
    showToast(`商机「${deal.name}」已推进至「${nextStage}」阶段！加权签约概率提升。`, 'success');
  };

  const totalWeighted = deals.reduce((acc, d) => {
    const weightMap = { 初步接洽: 0.15, 方案呈现: 0.35, 商务谈判: 0.6, 合同审批: 0.85, 赢单签约: 1.0 };
    return acc + (d.amount || 0) * (weightMap[d.stage] || 0.15);
  }, 0);

  return (
    <div id="module-deals" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              商机阶段漏斗看板 (Pipeline Kanban)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-blue-950 text-brand-600 dark:text-blue-400 text-xs font-semibold">
              加权总额 ¥{(totalWeighted / 10000).toFixed(1)}万 (真实动态汇总)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            全生命周期商机阶段推进，支持一键推进流转与多阶段金额实时自动核算
          </p>
        </div>
        <button
          onClick={onOpenNewDeal}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          <span>创建商机项目</span>
        </button>
      </div>

      {/* 5-Stage Complete Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAGE_CONFIG.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
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
                      className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-brand-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {deal.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{deal.owner || '陈明'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{deal.desc}</div>
                      <div className={`mt-2 text-xs font-mono font-bold ${stage.colorClass}`}>
                        ¥{Number(deal.amount || 0).toLocaleString()}
                      </div>

                      {stage.nextStage ? (
                        <button
                          onClick={() => handleAdvance(deal, stage.nextStage)}
                          className="mt-3 w-full py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-brand-500 hover:text-white text-[11px] font-medium transition-colors text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-1"
                        >
                          <span>{stage.nextBtnLabel}</span>
                        </button>
                      ) : (
                        <span className="inline-block mt-3 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                          首付款已到账 · 交付进行中
                        </span>
                      )}
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
