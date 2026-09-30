import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

const COLUMNS = [
  {
    dot: 'bg-blue-500',
    title: '初步接洽 (15%)',
    total: '¥1.8M',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    cards: [
      {
        id: 'hikvision',
        name: '海康威视',
        desc: '视觉AI模型私有化',
        amount: '¥600,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-brand-600',
        stage: '方案呈现',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-brand-500 hover:text-white text-[11px] font-medium transition-colors',
        buttonLabel: '推进至方案呈现 →',
      },
      {
        id: 'sugon',
        name: '中科曙光',
        desc: '超算作业调度软件',
        amount: '¥1,200,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-brand-600',
        stage: '方案呈现',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-brand-500 hover:text-white text-[11px] font-medium transition-colors',
        buttonLabel: '推进至方案呈现 →',
      },
    ],
  },
  {
    dot: 'bg-indigo-500',
    title: '方案呈现 (35%)',
    total: '¥2.65M',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    cards: [
      {
        id: 'sf',
        name: '顺丰科技',
        desc: '供应链端到端调度',
        amount: '¥850,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-indigo-600',
        stage: '商务谈判',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-indigo-600 hover:text-white text-[11px] font-medium transition-colors',
        buttonLabel: '推进至商务谈判 →',
      },
      {
        id: 'sensetime',
        name: '商汤科技',
        desc: '多模态基准自动化评测',
        amount: '¥500,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-indigo-600',
        stage: '商务谈判',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-indigo-600 hover:text-white text-[11px] font-medium transition-colors',
        buttonLabel: '推进至商务谈判 →',
      },
    ],
  },
  {
    dot: 'bg-purple-500',
    title: '商务谈判 (60%)',
    total: '¥3.9M',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    cards: [
      {
        id: 'htsc',
        name: '华泰证券',
        desc: '量化风控套件二期',
        amount: '¥1,500,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-purple-600',
        stage: '合同审批',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-purple-600 hover:text-white text-[11px] font-medium transition-colors',
        buttonLabel: '推进至合同审批 →',
      },
    ],
  },
  {
    dot: 'bg-amber-500',
    title: '合同审批 (85%)',
    total: '¥2.4M',
    totalClass: 'text-[10px] font-mono text-zinc-400',
    cards: [
      {
        id: 'dahua',
        name: '大华股份',
        desc: '视频集群分析授权',
        amount: '¥2,400,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-amber-300 dark:border-amber-800 shadow-xs',
        nameClass: 'text-xs font-bold',
        amountClass: 'mt-2 text-xs font-mono font-bold text-amber-600',
        stage: '赢单签约',
        buttonClass:
          'mt-3 w-full py-1 rounded bg-amber-500 text-white hover:bg-amber-600 text-[11px] font-semibold transition-colors',
        buttonLabel: '双方盖章赢单！🎉',
      },
    ],
  },
  {
    dot: 'bg-emerald-500',
    title: '赢单签约 (100%)',
    total: '¥825,400',
    totalClass: 'text-[10px] font-mono text-emerald-600 font-bold',
    cards: [
      {
        id: 'lixiang',
        name: '理想汽车',
        desc: '车载语音交互模块',
        amount: '¥525,400',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs',
        nameClass: 'text-xs font-bold text-emerald-700 dark:text-emerald-300',
        amountClass: 'mt-2 text-xs font-mono font-bold text-emerald-600',
        badge: '首付款已到账',
      },
      {
        id: 'weimob',
        name: '微盟集团',
        desc: '数据中台营销扩容',
        amount: '¥300,000',
        cardClass:
          'bg-white dark:bg-zinc-800 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs',
        nameClass: 'text-xs font-bold text-emerald-700 dark:text-emerald-300',
        amountClass: 'mt-2 text-xs font-mono font-bold text-emerald-600',
        badge: '已完成交付验收',
      },
    ],
  },
];

export default function Deals({ active, onOpenNewDeal }) {
  const showToast = useToast();
  const [shrinking, setShrinking] = useState([]);
  const [removed, setRemoved] = useState([]);

  // Columns keep their totals and the card is never re-added elsewhere; the card just disappears.
  const moveDealStage = (id, nextStage) => {
    setShrinking((list) => [...list, id]);
    setTimeout(() => {
      setRemoved((list) => [...list, id]);
      showToast(`商机已推进至「${nextStage}」阶段！加权签约概率提升。`, 'success');
    }, 200);
  };

  return (
    <div id="module-deals" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              商机阶段漏斗看板 (Pipeline Kanban)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-blue-950 text-brand-600 text-xs font-semibold">
              加权总额 ¥6,420,000
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            全生命周期商机阶段推进，支持随时拖拽调整与预测核算
          </p>
        </div>
        <button
          onClick={onOpenNewDeal}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          <span>创建商机项目</span>
        </button>
      </div>
      {/* 5-Stage Complete Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((column) => (
          <div
            key={column.title}
            className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${column.dot}`} />
                  <span className="text-xs font-bold">{column.title}</span>
                </div>
                <span className={column.totalClass}>{column.total}</span>
              </div>
              <div className="space-y-3">
                {column.cards
                  .filter((card) => !removed.includes(card.id))
                  .map((card) => (
                    <div
                      key={card.id}
                      className={card.cardClass}
                      style={shrinking.includes(card.id) ? { transform: 'scale(0.95)' } : undefined}
                    >
                      <div className={card.nameClass}>{card.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{card.desc}</div>
                      <div className={card.amountClass}>{card.amount}</div>
                      {card.badge ? (
                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 text-[10px] font-semibold">
                          {card.badge}
                        </span>
                      ) : (
                        <button
                          onClick={() => moveDealStage(card.id, card.stage)}
                          className={card.buttonClass}
                        >
                          {card.buttonLabel}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
