import { useState } from 'react';
import { useToast } from '../hooks/useToast';

const ACTIVE_TAB =
  'px-3.5 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-xs transition-all';
const INACTIVE_TAB =
  'px-3.5 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition-all';

export default function Customers({ active, onOpenFollowup }) {
  const showToast = useToast();
  const [tab, setTab] = useState('private');

  const releaseToOpenSea = (company) => {
    if (confirm(`确定将客户「${company}」主动退回公共公海池吗？`)) {
      showToast(`客户「${company}」已释放至公海池，他人可自主捡入。`);
    }
  };
  const claimCustomer = (company) => {
    showToast(`已成功将「${company}」从公海池捡入您的私海！请在15天内完成首访。`, 'success');
    setTimeout(() => setTab('private'), 600);
  };

  return (
    <div id="module-customers" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              客户资产与公海池 (Accounts & Open Sea)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-xs font-semibold">
              15天超时自动流转公海
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            企业私海专属大客户保护与公共客户资源高效捡入流转机制
          </p>
        </div>
        {/* Tab Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
          <button
            id="cust-tab-private"
            onClick={() => setTab('private')}
            className={tab === 'private' ? ACTIVE_TAB : INACTIVE_TAB}
          >
            我的私海客户 (28 家)
          </button>
          <button
            id="cust-tab-public"
            onClick={() => setTab('public')}
            className={tab === 'public' ? ACTIVE_TAB : INACTIVE_TAB}
          >
            公共客户公海池 (142 家)
          </button>
        </div>
      </div>
      {/* Private Customers Section */}
      <div
        id="cust-section-private"
        className={tab === 'private' ? 'space-y-4' : 'space-y-4 hidden'}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200">
                  KA 战略大客户
                </span>{' '}
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-2">
                  浙江大华技术股份有限公司
                </h4>
                <p className="text-xs text-zinc-400">杭州 · 智能安防 · 年营收 320亿</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-brand-600 font-bold text-xs flex items-center justify-center">
                大华
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs flex justify-between">
              <span>商机: 2个 (¥240万)</span>
              <span className="text-emerald-600 font-medium">离公海还剩 14 天</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onOpenFollowup('浙江大华技术股份有限公司')}
                className="flex-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-xs font-medium transition-colors"
              >
                写跟进
              </button>
              <button
                onClick={() => releaseToOpenSea('浙江大华技术股份有限公司')}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:text-rose-500"
              >
                退回公海
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200">
                  VIP 重点客户
                </span>{' '}
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-2">
                  华泰证券股份有限公司
                </h4>
                <p className="text-xs text-zinc-400">南京 · 金融科技 · 头部证券机构</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 font-bold text-xs flex items-center justify-center">
                华泰
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs flex justify-between">
              <span>商机: 1个 (¥150万)</span>
              <span className="text-emerald-600 font-medium">离公海还剩 12 天</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onOpenFollowup('华泰证券股份有限公司')}
                className="flex-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-xs font-medium transition-colors"
              >
                写跟进
              </button>
              <button
                onClick={() => releaseToOpenSea('华泰证券股份有限公司')}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:text-rose-500"
              >
                退回公海
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200">
                  成长型客户
                </span>{' '}
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-2">
                  顺丰科技有限公司
                </h4>
                <p className="text-xs text-zinc-400">深圳 · 智慧供应链系统</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold text-xs flex items-center justify-center">
                顺丰
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs flex justify-between">
              <span>商机: 1个 (¥85万)</span>
              <span className="text-rose-500 font-medium">离公海仅剩 2 天 (急需跟进)</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onOpenFollowup('顺丰科技有限公司')}
                className="flex-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-xs font-medium transition-colors"
              >
                写跟进
              </button>
              <button
                onClick={() => releaseToOpenSea('顺丰科技有限公司')}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:text-rose-500"
              >
                退回公海
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Public Open Sea Section */}
      <div id="cust-section-public" className={tab === 'public' ? 'space-y-4' : 'hidden space-y-4'}>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <span>
            ⚠️ 公海客户池说明：任何人均可自主捡入，每位销售人员最多同时保留 30 家私海客户。捡入后 15
            天内无拜访记录将自动重新流回公海。
          </span>
          <span className="font-bold">当前私海额度: 28/30</span>
        </div>
        <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="py-3 px-4">公海企业名称</th>
                <th className="py-3 px-4">所属行业 / 城市</th>
                <th className="py-3 px-4">原前任负责人</th>
                <th className="py-3 px-4">流回公海原因</th>
                <th className="py-3 px-4">在公海停留时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                <td className="py-3.5 px-4 font-bold">苏宁易购集团零售云</td>
                <td className="py-3.5 px-4">新零售 / 南京</td>
                <td className="py-3.5 px-4">赵峰 (已离职)</td>
                <td className="py-3.5 px-4 text-zinc-500">人员离职流转公海</td>
                <td className="py-3.5 px-4 font-mono">3 天</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => claimCustomer('苏宁易购集团零售云')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                  >
                    捡入我的私海
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                <td className="py-3.5 px-4 font-bold">无锡先导智能装备</td>
                <td className="py-3.5 px-4">锂电设备 / 无锡</td>
                <td className="py-3.5 px-4">林晓峰</td>
                <td className="py-3.5 px-4 text-rose-500">超过15天未跟进系统回收</td>
                <td className="py-3.5 px-4 font-mono">1 天</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => claimCustomer('无锡先导智能装备')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                  >
                    捡入我的私海
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                <td className="py-3.5 px-4 font-bold">上海联影医疗科技</td>
                <td className="py-3.5 px-4">高端医疗器械 / 上海</td>
                <td className="py-3.5 px-4">苏雅洁</td>
                <td className="py-3.5 px-4 text-zinc-500">销售主动释放</td>
                <td className="py-3.5 px-4 font-mono">5 天</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => claimCustomer('上海联影医疗科技')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                  >
                    捡入我的私海
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
