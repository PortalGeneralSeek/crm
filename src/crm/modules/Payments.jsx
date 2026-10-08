import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import { crmApi } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

export default function Payments({ active }) {
  const showToast = useToast();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contractNo: 'CT-2026-001',
    customerName: '',
    amount: '',
    type: 'prepayment',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getPayments({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim(),
        status: statusFilter,
      });
      if (res.data) {
        setPayments(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取回款数据失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadPayments();
    }
  }, [active, keyword, statusFilter]);

  const handleAudit = async (p) => {
    try {
      await crmApi.auditPayment(p.id, 'audited');
      showToast(`回款流水【${p.paymentNo}】对账核准成功！资金已正式计入系统净营收。`, 'success');
      loadPayments();
    } catch (err) {
      showToast(`审核回款失败: ${err.message}`, 'error');
    }
  };

  const handleIssueInvoice = async (p) => {
    try {
      await crmApi.issueInvoice(p.id);
      showToast(`流水【${p.paymentNo}】增值税专用发票已自动开具并推送至客户财务邮箱！`, 'success');
      loadPayments();
    } catch (err) {
      showToast(`开票失败: ${err.message}`, 'error');
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.amount) {
      showToast('请填写客户名称与到账金额', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createPayment({
        contractNo: formData.contractNo.trim(),
        customerName: formData.customerName.trim(),
        amount: parseFloat(formData.amount),
        type: formData.type,
        paymentDate: formData.paymentDate,
      });
      showToast('银行回款流水已成功认领并录入系统！待财务审计核验。', 'success');
      setCreateModalOpen(false);
      setFormData({
        contractNo: 'CT-2026-001',
        customerName: '',
        amount: '',
        type: 'prepayment',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      loadPayments();
    } catch (err) {
      showToast(`认领回款失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const auditedTotal = payments
    .filter((p) => p.status === 'audited')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingTotal = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const unissuedInvoices = payments.filter((p) => p.invoiceStatus === 'unissued').length;

  const renderTypeLabel = (type) => {
    switch (type) {
      case 'prepayment':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium">首付款 (预付款)</span>;
      case 'milestone':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 font-medium">阶段进度款</span>;
      case 'final':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-medium">尾款结清</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600">{type}</span>;
    }
  };

  return (
    <div id="module-payments" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              回款与发票税务中心 (Payments & Invoicing)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 text-xs font-semibold">
              已入账 ¥{(auditedTotal / 10000).toFixed(1)}万
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            资金回笼监控、企业银行电汇流水认领、财务审计核销与增值税数电发票全流程闭环
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>认领银行流水</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">已确认到账 (累计入账)</div>
          <div className="text-2xl font-mono font-bold mt-1 text-emerald-600">
            ¥{auditedTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">财务合规审计已放行</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">待审核对账款项</div>
          <div className="text-2xl font-mono font-bold mt-1 text-blue-600">
            ¥{pendingTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">认领待财务终审</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">待开具发票</div>
          <div className="text-2xl font-mono font-bold mt-1 text-amber-500">{unissuedInvoices} 笔</div>
          <div className="text-[11px] text-amber-500 mt-1">需要核验纳税人税号</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">总流水笔数</div>
          <div className="text-2xl font-mono font-bold mt-1 text-zinc-800 dark:text-zinc-200">{total} 笔</div>
          <div className="text-[11px] text-zinc-400 mt-1">资金电汇流水闭环</div>
        </div>
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
              placeholder="搜索流水编号、客户主体、合同号..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none"
          >
            <option value="">全部对账状态</option>
            <option value="pending">待财务审核 (pending)</option>
            <option value="audited">已审核到账 (audited)</option>
            <option value="rejected">已驳回 (rejected)</option>
          </select>
        </div>
        <div className="text-xs text-zinc-400">
          共收录回款: <span className="font-bold text-brand-600">{total}</span> 笔
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">正在调取回款账目记录...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">暂无符合条件的回款流水</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="py-3 px-4">流水单号 / 关联合同</th>
                <th className="py-3 px-4">签约客户主体</th>
                <th className="py-3 px-4">款项性质</th>
                <th className="py-3 px-4">到账金额</th>
                <th className="py-3 px-4">到账日期</th>
                <th className="py-3 px-4">对账审核状态</th>
                <th className="py-3 px-4">发票状态</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.paymentNo}</div>
                    <div className="text-[10px] text-zinc-400">合同: {p.contractNo || '未绑定'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">{p.customerName}</td>
                  <td className="py-3.5 px-4">{renderTypeLabel(p.type)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 text-sm">
                    ¥{Number(p.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 font-mono">{p.paymentDate || '-'}</td>
                  <td className="py-3.5 px-4">
                    {p.status === 'audited' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                        审核入账 ✅ ({p.auditBy || '财务部'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-300">
                        待财务核准
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.invoiceStatus === 'issued' ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 text-[11px] font-medium">
                        已开专票
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px]">
                        未开票
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleAudit(p)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          审核对账
                        </button>
                      )}
                      {p.invoiceStatus === 'unissued' && (
                        <button
                          onClick={() => handleIssueInvoice(p)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          开具发票
                        </button>
                      )}
                      <button
                        onClick={() => showToast(`正在调取流水【${p.paymentNo}】的银行电汇电子回单...`)}
                        className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs transition-colors"
                      >
                        回单
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Claim / Add Payment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">认领银行回款流水</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  签约付款客户主体 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="例如：比亚迪股份有限公司"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  关联合同编号
                </label>
                <input
                  type="text"
                  value={formData.contractNo}
                  onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                  placeholder="CT-2026-001"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    回款到账金额 (¥) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="500000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    款项性质
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="prepayment">首付款 (预付款)</option>
                    <option value="milestone">阶段进度款</option>
                    <option value="final">尾款结清</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  银行电汇到账日
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
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
                  {submitting ? '录入中...' : '确认认领回款'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
