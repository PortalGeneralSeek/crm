import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

export default function NewLeadModal({ open, onClose }) {
  const showToast = useToast();
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');

  const handleCreateLead = (e) => {
    e.preventDefault();
    onClose();
    showToast(`线索「${company} - ${name}」已录入线索池！`, 'success');
  };

  return (
    <div
      id="modal-new-lead"
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4${open ? '' : ' hidden'}`}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="user-plus" className="w-4 h-4 text-brand-500" />
            录入销售线索
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleCreateLead} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">企业/客户全称 *</label>{' '}
            <input
              type="text"
              id="lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              placeholder="如: 哔哩哔哩科技有限公司"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">联系人姓名</label>{' '}
              <input
                type="text"
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="张经理"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">联系电话/手机</label>{' '}
              <input
                type="tel"
                id="lead-phone"
                placeholder="138 0000 0000"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">线索来源</label>{' '}
            <select
              id="lead-source"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            >
              <option>市场活动 / 峰会展台</option>
              <option>官网自主咨询表单</option>
              <option>老客户转介绍</option>
              <option>外部渠道与代理商</option>
            </select>
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
              保存入库
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
