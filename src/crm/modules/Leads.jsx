import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';
import { useCrmStore, crmStore } from '../store/crmStore';

const ACTIVE_CATEGORY =
  'leads-cat-btn px-3 py-1 rounded-lg text-xs font-semibold bg-brand-500 text-white';
const INACTIVE_CATEGORY =
  'leads-cat-btn px-3 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800';

// Approximates the row's rendered text (cells separated by tabs) that the filters match against.
const rowText = (lead) =>
  [
    lead.company,
    lead.contact,
    lead.level.text,
    lead.channel,
    lead.status.text,
    lead.owner,
    lead.convertible ? '一键转商机' : '已签约入库',
  ].join('\t');

export default function Leads({ active, onOpenNewLead, onConvertLead }) {
  const showToast = useToast();
  const { leads } = useCrmStore();
  const [category, setCategory] = useState('all');
  // Category buttons and the search box each overwrite the other's row visibility; the last one used wins.
  const [filter, setFilter] = useState({ kind: 'category', value: 'all' });

  const categories = [
    { key: 'all', label: `全部 (${leads.length})` },
    { key: '待跟进', label: `待跟进 (${leads.filter((l) => l.status.text === '待跟进').length})` },
    { key: '跟进中', label: `跟进中 (${leads.filter((l) => l.status.text === '跟进中').length})` },
    { key: '已转商机', label: `已转商机 (${leads.filter((l) => l.status.text === '已转商机').length})` },
  ];

  const isVisible = (lead) => {
    const text = rowText(lead);
    if (filter.kind === 'category') return filter.value === 'all' || text.includes(filter.value);
    return !filter.value || text.toLowerCase().includes(filter.value);
  };

  const handleConvert = (lead) => {
    crmStore.convertLeadToDeal(lead.id, {
      company: lead.company,
      title: `${lead.company} 2026年度企业数字化采购`,
      amount: 600000,
    });
    showToast(`线索「${lead.company}」已成功转化为商机并写入商机看板！`, 'success');
    if (onConvertLead) onConvertLead(lead.company);
  };

  return (
    <div id="module-leads" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              全域线索池管理 (Leads Management)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 text-xs font-semibold">
              自动智能清洗
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            涵盖官网咨询、市场峰会、合作伙伴与渠道转介绍等多来源线索全流程跟进
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewLead}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>录入新线索</span>
          </button>
          <button
            onClick={() => showToast('智能算法已完成 24 条线索的自动分流派发！')}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="users" className="w-3.5 h-3.5" />
            <span>批量智能派单</span>
          </button>
        </div>
      </div>
      {/* Leads KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">今日新增线索</div>
          <div className="text-2xl font-mono font-bold mt-1 text-zinc-900 dark:text-zinc-100">
            +12 <span className="text-xs text-emerald-500 font-normal">↑ 18%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">待跟进分配</div>
          <div className="text-2xl font-mono font-bold mt-1 text-amber-500">24 条</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">A级高潜线索</div>
          <div className="text-2xl font-mono font-bold mt-1 text-purple-600">18 家</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">当月线索转化率</div>
          <div className="text-2xl font-mono font-bold mt-1 text-emerald-600">28.4%</div>
        </div>
      </div>
      {/* Leads Data Table */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setCategory(c.key);
                  setFilter({ kind: 'category', value: c.key });
                }}
                className={category === c.key ? ACTIVE_CATEGORY : INACTIVE_CATEGORY}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            onChange={(e) =>
              setFilter({ kind: 'search', value: e.target.value.toLowerCase().trim() })
            }
            placeholder="搜索线索公司/联系人..."
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none w-48"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="leads-table">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">企业客户名称</th>
                <th className="py-3 px-4">联系人 / 手机</th>
                <th className="py-3 px-4">意向级别</th>
                <th className="py-3 px-4">线索来源渠道</th>
                <th className="py-3 px-4">当前状态</th>
                <th className="py-3 px-4">负责销售</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80" id="leads-tbody">
              {leads.map((lead) => (
                <tr
                  key={lead.id || lead.company}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                  style={isVisible(lead) ? undefined : { display: 'none' }}
                >
                  <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                    {lead.company}
                  </td>
                  <td className="py-3 px-4">{lead.contact}</td>
                  <td className="py-3 px-4">
                    <span className={lead.level?.className || 'px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]'}>
                      {lead.level?.text || '意向客户'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{lead.channel}</td>
                  <td className="py-3 px-4">
                    <span className={lead.status?.className || 'text-blue-500 font-medium'}>
                      {lead.status?.text || '待跟进'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{lead.owner}</td>
                  <td className="py-3 px-4 text-right">
                    {lead.convertible ? (
                      <button
                        onClick={() => handleConvert(lead)}
                        className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-[11px] shadow-xs"
                      >
                        一键转商机
                      </button>
                    ) : (
                      <span className="text-zinc-400 text-[11px]">已签约入库</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
