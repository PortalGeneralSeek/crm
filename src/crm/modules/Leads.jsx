import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { useToast } from '../hooks/useToast';
import { useAuth, crmApi } from '../services/crmApi';

const ACTIVE_CATEGORY =
  'leads-cat-btn px-3 py-1 rounded-lg text-xs font-semibold bg-brand-500 text-white shadow-xs transition-all';
const INACTIVE_CATEGORY =
  'leads-cat-btn px-3 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all';

export default function Leads({ active, onOpenNewLead, onConvertLead }) {
  const showToast = useToast();
  const auth = useAuth();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');

  // Create Lead Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    phone: '',
    email: '',
    title: '部门采购总监',
    source: '官网咨询',
    budget: '200000',
  });

  const loadLeads = async () => {
    setLoading(true);
    try {
      const statusParam = category === 'all' ? '' : category;
      const res = await crmApi.getLeads({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim(),
        status: statusParam,
      });
      if (res.data) {
        setLeads(res.data.list || res.data.leads || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取线索列表失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadLeads();
    }
  }, [active, category, keyword]);

  const handleConvert = async (lead) => {
    try {
      await crmApi.convertLead(lead.id, {
        company: lead.company,
        dealName: `${lead.company} · 数字化采购方案`,
        amount: lead.budget > 0 ? lead.budget : 250000,
      });
      showToast(`线索「${lead.company}」已成功转化为商机，并同步建档客户档案与商机管道！`, 'success');
      loadLeads();
      if (onConvertLead) onConvertLead(lead.company);
    } catch (err) {
      showToast(`转化失败: ${err.message}`, 'error');
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.name.trim()) {
      showToast('企业全称与联系人姓名为必填项', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createLead({
        company: formData.company.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        title: formData.title.trim(),
        source: formData.source,
        budget: parseFloat(formData.budget) || 100000,
      });
      showToast(`线索「${formData.company}」录入成功！`, 'success');
      setCreateModalOpen(false);
      setFormData({
        company: '',
        name: '',
        phone: '',
        email: '',
        title: '部门采购总监',
        source: '官网咨询',
        budget: '200000',
      });
      loadLeads();
    } catch (err) {
      showToast(`录入线索失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800">
            待跟进
          </span>
        );
      case 'contacted':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200 dark:border-amber-800">
            跟进沟通中
          </span>
        );
      case 'qualified':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200 dark:border-purple-800">
            重点合格潜客
          </span>
        );
      case 'converted':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
            已成功转商机 ✅
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {status}
          </span>
        );
    }
  };

  // Dynamic Metrics
  const newCount = leads.filter((l) => l.status === 'new').length;
  const contactedCount = leads.filter((l) => l.status === 'contacted').length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = total > 0 ? ((convertedCount / total) * 100).toFixed(1) : '0.0';

  const categories = [
    { key: 'all', label: `全部线索 (${total})` },
    { key: 'new', label: `待跟进 (${newCount})` },
    { key: 'contacted', label: `跟进中 (${contactedCount})` },
    { key: 'converted', label: `已转商机 (${convertedCount})` },
  ];

  return (
    <div id="module-leads" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              全域线索池管理 (Leads Management)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 text-xs font-semibold">
              持久化事务隔离
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            官网咨询、峰会洽谈与渠道推介线索全生命周期跟进 · 一键原子事务转化商机
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>录入新线索</span>
          </button>
          <button
            onClick={() => showToast('智能派单算法已完成线索与客户经理标签的最优匹配！', 'success')}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="users" className="w-3.5 h-3.5" />
            <span>批量智能派单</span>
          </button>
        </div>
      </div>

      {/* Leads KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">线索库总容量</div>
          <div className="text-2xl font-mono font-bold mt-1 text-zinc-900 dark:text-zinc-100">
            {total} <span className="text-xs text-brand-600 font-normal">条</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">待首访跟进</div>
          <div className="text-2xl font-mono font-bold mt-1 text-amber-500">
            {newCount} 条
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">已转化为商机</div>
          <div className="text-2xl font-mono font-bold mt-1 text-purple-600">
            {convertedCount} 家
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">综合转化率</div>
          <div className="text-2xl font-mono font-bold mt-1 text-emerald-600">
            {conversionRate}%
          </div>
        </div>
      </div>

      {/* Leads Data Table */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={category === c.key ? ACTIVE_CATEGORY : INACTIVE_CATEGORY}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Icon name="search" className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索企业客户/联系人/电话..."
              className="pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none w-56 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">正在调取真实线索池数据...</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">暂无符合条件的线索记录</div>
          ) : (
            <table className="w-full text-left text-xs" id="leads-table">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">企业客户全称</th>
                  <th className="py-3 px-4">关键对接人</th>
                  <th className="py-3 px-4">预估预算</th>
                  <th className="py-3 px-4">线索来源渠道</th>
                  <th className="py-3 px-4">当前流转状态</th>
                  <th className="py-3 px-4">负责人</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80" id="leads-tbody">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{lead.company}</div>
                      <div className="text-[10px] text-zinc-400">{lead.title || '企业代表'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-800 dark:text-zinc-200">{lead.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400">{lead.phone || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-600">
                      ¥{Number(lead.budget || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">{lead.source || '官网咨询'}</td>
                    <td className="py-3 px-4">{renderStatusBadge(lead.status)}</td>
                    <td className="py-3 px-4 text-zinc-400">{lead.ownerName || '销售团队'}</td>
                    <td className="py-3 px-4 text-right">
                      {lead.status !== 'converted' ? (
                        <button
                          onClick={() => handleConvert(lead)}
                          className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-[11px] shadow-xs transition-colors"
                        >
                          一键转商机
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px]">已签约入库</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">录入新线索资源</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  企业客户全称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="例如：北京百度网讯科技有限公司"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    首要联系人 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="王总监"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="13900139000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    线索来源渠道
                  </label>
                  <Select
                    value={formData.source}
                    onChange={(val) => setFormData({ ...formData, source: val })}
                    fullWidth
                    size="md"
                    options={[
                      { value: '官网咨询', label: '官网咨询' },
                      { value: '行业展会', label: '行业展会峰会' },
                      { value: '生态合作伙伴', label: '生态合作伙伴' },
                      { value: '客户转介绍', label: '老客户转介绍' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    预估采购预算 (¥)
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="200000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? '录入中...' : '确认录入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
