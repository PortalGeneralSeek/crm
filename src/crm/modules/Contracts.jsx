import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

export default function Contracts({ active }) {
  const showToast = useToast();
  const [approved, setApproved] = useState(false);

  const approveContract = (contractNo) => {
    setApproved(true);
    showToast(`合同 ${contractNo} 审批通过！已自动流转至法务盖章环节。`, 'success');
  };

  return (
    <div id="module-contracts" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              合同与订单流转中心 (Contracts & Orders)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 text-xs font-semibold">
              2 份待我审批
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            电子合同签章、非标条款法务审查与多级权签审批流
          </p>
        </div>
        <button
          onClick={() => showToast('正在调取企业标准销售合同模板库...')}
          className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
        >
          <Icon name="file-plus" className="w-3.5 h-3.5" />
          <span>起草新销售合同</span>
        </button>
      </div>
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
            <tr>
              <th className="py-3.5 px-4">合同编号 / 标题</th>
              <th className="py-3.5 px-4">签约客户主体</th>
              <th className="py-3.5 px-4">合同总金额</th>
              <th className="py-3.5 px-4">审批链节点状态</th>
              <th className="py-3.5 px-4">申请人 / 时间</th>
              <th className="py-3.5 px-4 text-right">审核操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">HT-2026-09028</div>
                <div className="text-[10px] text-zinc-400">大华股份智慧安防算法授权年度合同</div>
              </td>
              <td className="py-3.5 px-4 font-medium">浙江大华技术股份有限公司</td>
              <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-sm">¥2,400,000</td>
              <td className="py-3.5 px-4">
                {approved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                    已审批通过 · 待双方电子签章
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    待销售总监审批 (陈明)
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-zinc-400">李晓鹏 · 09-28 09:30</td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {approved ? (
                    <span className="text-emerald-600 font-semibold text-xs">已核准签字 ✅</span>
                  ) : (
                    <>
                      <button
                        onClick={() => approveContract('HT-2026-09028')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        批准签署
                      </button>
                      <button
                        onClick={() => showToast('已退回修改，附言：请补充附录二交付节点 SLA')}
                        className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        退回
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">HT-2026-09015</div>
                <div className="text-[10px] text-zinc-400">华泰证券二期智能风控系统服务协议</div>
              </td>
              <td className="py-3.5 px-4 font-medium">华泰证券股份有限公司</td>
              <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-sm">¥1,500,000</td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                  法务审核已通过 · 待客户用印
                </span>
              </td>
              <td className="py-3.5 px-4 text-zinc-400">陈明 · 09-27 15:40</td>
              <td className="py-3.5 px-4 text-right">
                <button
                  onClick={() => showToast('已向客户法务发送契约锁电子签催办提醒')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  催促用印
                </button>
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
              <td className="py-3.5 px-4">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">HT-2026-08892</div>
                <div className="text-[10px] text-zinc-400">理想汽车智能座舱定制开发合同</div>
              </td>
              <td className="py-3.5 px-4 font-medium">北京车和家信息技术有限公司</td>
              <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 text-sm">¥525,400</td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                  双方法人电子签已生效 ✅
                </span>
              </td>
              <td className="py-3.5 px-4 text-zinc-400">陈明 · 09-20 11:20</td>
              <td className="py-3.5 px-4 text-right">
                <button
                  onClick={() => showToast('正在下载已加盖双方电子印章的合同 PDF 归档件...')}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-300 text-xs"
                >
                  下载PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
