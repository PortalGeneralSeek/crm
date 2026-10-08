import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import { crmApi } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

export default function Contracts({ active }) {
  const showToast = useToast();
  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Draft modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    customerName: '',
    amount: '',
    signDate: new Date().toISOString().split('T')[0],
  });

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getContracts({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim(),
        status: statusFilter,
      });
      if (res.data) {
        setContracts(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取合同数据失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadContracts();
    }
  }, [active, keyword, statusFilter]);

  const handleApprove = async (contract) => {
    try {
      await crmApi.approveContract(contract.id);
      showToast(`合同【${contract.contractNo}】审批核准通过！已自动流转至法务盖章环节。`, 'success');
      loadContracts();
    } catch (err) {
      showToast(`审批失败: ${err.message}`, 'error');
    }
  };

  const handleDraftContract = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.customerName.trim() || !formData.amount) {
      showToast('请完整填写合同标题、客户主体与合同金额', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createContract({
        title: formData.title.trim(),
        customerName: formData.customerName.trim(),
        amount: parseFloat(formData.amount),
        signDate: formData.signDate,
      });
      showToast('新销售合同已成功起草并提交法务与总监审批链！', 'success');
      setDraftModalOpen(false);
      setFormData({
        title: '',
        customerName: '',
        amount: '',
        signDate: new Date().toISOString().split('T')[0],
      });
      loadContracts();
    } catch (err) {
      showToast(`起草合同失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = contracts.filter((c) => c.status === 'pending_approval').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            待审批签署 (待总监核准)
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800">
            审批已通过 · 待客户用印
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
            已生效履行中 ✅
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
            执行完毕归档 📑
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="module-contracts" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              合同与订单流转中心 (Contracts & Orders)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 text-xs font-semibold">
              {pendingCount} 份待审批
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            电子合同签章、非标条款法务审查与多级权签审批流 · 实时持久化协同
          </p>
        </div>
        <button
          onClick={() => setDraftModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Icon name="file-plus" className="w-3.5 h-3.5" />
          <span>起草新销售合同</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121316] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Icon name="search" className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索合同编号、标题、签约客户..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none"
          >
            <option value="">全部状态</option>
            <option value="pending_approval">待总监审批 (pending_approval)</option>
            <option value="approved">审批通过 (approved)</option>
            <option value="active">执行生效 (active)</option>
            <option value="completed">归档完成 (completed)</option>
          </select>
        </div>
        <div className="text-xs text-zinc-400">
          共收录合同: <span className="font-bold text-brand-600">{total}</span> 份
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">正在调取数据库合同数据...</div>
        ) : contracts.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">暂无符合条件的合同记录</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="py-3.5 px-4">合同编号 / 标题</th>
                <th className="py-3.5 px-4">签约客户主体</th>
                <th className="py-3.5 px-4">合同总金额</th>
                <th className="py-3.5 px-4">审批链节点状态</th>
                <th className="py-3.5 px-4">申请人 / 签署日期</th>
                <th className="py-3.5 px-4 text-right">审核操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.contractNo}</div>
                    <div className="text-[10px] text-zinc-400 line-clamp-1">{c.title}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">{c.customerName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-sm">
                    ¥{Number(c.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">{renderStatusBadge(c.status)}</td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {c.ownerName || '销售团队'} · {c.signDate || '未签署'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === 'pending_approval' ? (
                        <>
                          <button
                            onClick={() => handleApprove(c)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                          >
                            批准签署
                          </button>
                          <button
                            onClick={() => showToast(`已退回修改，附言：请完善【${c.title}】交付SLA条款`)}
                            className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 transition-colors"
                          >
                            退回
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => showToast(`正在调取合同【${c.contractNo}】的电子回单与双方用印归档件...`)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs transition-colors"
                        >
                          下载PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Draft Contract Modal */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">起草新销售合同</h3>
              <button
                onClick={() => setDraftModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDraftContract} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  合同项目标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：大华股份 智能视频算法年度授权合同"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  签约客户主体 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="例如：浙江大华技术股份有限公司"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    合同总金额 (¥) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="2400000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    签署履约日期
                  </label>
                  <input
                    type="date"
                    value={formData.signDate}
                    onChange={(e) => setFormData({ ...formData, signDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDraftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? '提交中...' : '提交审批链'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
