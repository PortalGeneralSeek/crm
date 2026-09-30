import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

export default function Payments({ active }) {
  const showToast = useToast();

  return (
    <div id="module-payments" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              回款与发票税务中心 (Payments & Invoicing)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 text-xs font-semibold">
              当月到账 ¥82.5万
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            资金回笼监控、账期逾期催收预警与增值税发票核销闭环
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('打开快速录入回款单弹窗...')}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>认领银行流水</span>
          </button>
          <button
            onClick={() => showToast('申请开具增值税专用发票...')}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-xs font-medium"
          >
            开具发票
          </button>
        </div>
      </div>
      {/* Payment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">本月已确认到账</div>
          <div className="text-2xl font-mono font-bold mt-1 text-emerald-600">¥825,400</div>
          <div className="text-[11px] text-zinc-400 mt-1">达成月度回款 82.5%</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">本周待回款项</div>
          <div className="text-2xl font-mono font-bold mt-1 text-blue-600">¥380,000</div>
          <div className="text-[11px] text-zinc-400 mt-1">涉及 2 家签约企业</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">逾期应收账款</div>
          <div className="text-2xl font-mono font-bold mt-1 text-rose-500">¥65,000</div>
          <div className="text-[11px] text-rose-500 mt-1">逾期超 15 天已催缴</div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">已开票待核销</div>
          <div className="text-2xl font-mono font-bold mt-1 text-amber-500">¥210,000</div>
          <div className="text-[11px] text-zinc-400 mt-1">数电专票 3 笔</div>
        </div>
      </div>
      {/* Payment Records Table */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
            <tr>
              <th className="py-3 px-4">回款款项说明</th>
              <th className="py-3 px-4">签约客户</th>
              <th className="py-3 px-4">期数 / 比例</th>
              <th className="py-3 px-4">回款金额</th>
              <th className="py-3 px-4">计划到账日</th>
              <th className="py-3 px-4">当前状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4 font-bold">理想汽车车载语音模块 首期款</td>
              <td className="py-3.5 px-4">北京车和家信息技术有限公司</td>
              <td className="py-3.5 px-4">第 1 期 (50%)</td>
              <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">¥262,700</td>
              <td className="py-3.5 px-4 font-mono">09-25 (已到账)</td>
              <td className="py-3.5 px-4">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-semibold text-[11px]">
                  银行电汇已入账
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button
                  onClick={() => showToast('正在调取招商银行电汇电子回单...')}
                  className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300"
                >
                  查回收据
                </button>
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4 font-bold">微盟营销中台扩容款 全额款</td>
              <td className="py-3.5 px-4">上海微盟企业有限公司</td>
              <td className="py-3.5 px-4">一次性 (100%)</td>
              <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">¥300,000</td>
              <td className="py-3.5 px-4 font-mono">09-22 (已到账)</td>
              <td className="py-3.5 px-4">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-semibold text-[11px]">
                  银行电汇已入账
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button
                  onClick={() => showToast('正在调取银行电汇凭证...')}
                  className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300"
                >
                  查回收据
                </button>
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4 font-bold">苏州汇川技术自动化授权 首款</td>
              <td className="py-3.5 px-4">汇川技术股份有限公司</td>
              <td className="py-3.5 px-4">第 1 期 (40%)</td>
              <td className="py-3.5 px-4 font-mono font-bold text-amber-600">¥262,700</td>
              <td className="py-3.5 px-4 font-mono text-rose-500 font-semibold">09-30 (剩 2 天)</td>
              <td className="py-3.5 px-4">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 font-semibold text-[11px]">
                  财务已请款
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <button
                  onClick={() => showToast('已向汇川技术财务处推送催款跟进函')}
                  className="px-2.5 py-1 rounded bg-amber-500 text-white font-medium hover:bg-amber-600"
                >
                  发送催缴短信
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
