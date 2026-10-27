import { useState } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { useToast } from '../hooks/useToast';
import { crmStore } from '../store/crmStore';

export default function NewDealModal({
  open,
  title,
  company,
  onTitleChange,
  onCompanyChange,
  onClose,
}) {
  const showToast = useToast();
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('初步接洽');

  const handleCreateDeal = (e) => {
    e.preventDefault();
    if (!company.trim() || !title.trim()) return;
    crmStore.addDeal({
      name: company.trim(),
      desc: title.trim(),
      amount: Number(amount) || 0,
      stage: stage || '初步接洽',
    });
    onClose();
    showToast(`商机「${title}」创建成功！预估金额 ¥${Number(amount).toLocaleString()}`, 'success');
    if (onTitleChange) onTitleChange('');
    if (onCompanyChange) onCompanyChange('');
    setAmount('');
  };

  return (
    <div
      id="modal-new-deal"
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4${open ? '' : ' hidden'}`}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="badge-plus" className="w-4 h-4 text-brand-500" />
            录入新商机
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleCreateDeal} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">商机名称 *</label>{' '}
            <input
              type="text"
              id="new-deal-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              required
              placeholder="如: 百度智能云 2026 年度视觉集群采购"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">客户企业 *</label>{' '}
              <input
                type="text"
                id="new-deal-company"
                value={company}
                onChange={(e) => onCompanyChange(e.target.value)}
                required
                placeholder="百度在线网络技术"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">预估合同金额 (¥) *</label>{' '}
              <input
                type="number"
                id="new-deal-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="1200000"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">所属初始阶段</label>{' '}
              <Select
                id="new-deal-stage"
                value={stage}
                onChange={(val) => setStage(val)}
                fullWidth
                size="md"
                options={[
                  { value: '初步接洽', label: '初步接洽 (需求调研)' },
                  { value: '方案呈现', label: '方案呈现 (技术验证)' },
                  { value: '商务谈判', label: '商务谈判 (标书报价)' },
                ]}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">预计签约日期</label>{' '}
              <input
                type="date"
                id="new-deal-date"
                defaultValue="2026-10-31"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold"
            >
              立即创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
