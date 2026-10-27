import { useEffect, useRef } from 'react';
import Icon from '../../shared/Icon';
import { createCycleChart, createIndustryChart } from '../charts/biCharts';
import { useToast } from '../hooks/useToast';

export default function Analytics({ active, isDark }) {
  const showToast = useToast();
  const industryCanvas = useRef(null);
  const cycleCanvas = useRef(null);
  const industryChart = useRef(null);
  const cycleChart = useRef(null);
  const previousDark = useRef(isDark);

  // Charts are built the first time the module is shown and keep the theme they were created with.
  useEffect(() => {
    if (!active) return;
    if (!industryChart.current) {
      industryChart.current = createIndustryChart(industryCanvas.current, isDark);
    }
    if (!cycleChart.current) {
      cycleChart.current = createCycleChart(cycleCanvas.current, isDark);
    }
  }, [active]);

  useEffect(() => {
    if (previousDark.current === isDark) return;
    previousDark.current = isDark;
    industryChart.current?.update();
    cycleChart.current?.update();
  }, [isDark]);

  useEffect(
    () => () => {
      industryChart.current?.destroy();
      cycleChart.current?.destroy();
      industryChart.current = null;
      cycleChart.current = null;
    },
    [],
  );

  return (
    <div id="module-analytics" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              销售 BI 智能报表与客群洞察
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-brand-600 text-xs font-semibold">
              多维商业智能透视
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            成单转化耗时、客群行业分布、丢单根因归因与客单价深度剖析
          </p>
        </div>
        <button
          onClick={() => showToast('正在导出本季度全维度 BI 深度分析报告 PDF...')}
          className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
        >
          <Icon name="file-text" className="w-3.5 h-3.5" />
          <span>导出 BI 报表</span>
        </button>
      </div>
      {/* BI Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Industry Distribution (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Icon name="pie-chart" className="w-4 h-4 text-purple-500" />
              商机合同金额行业分布
            </h3>
            <span className="text-xs font-mono text-zinc-400">总计 ¥12.8M</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <canvas id="bi-industry-chart" ref={industryCanvas} />
          </div>
        </div>
        {/* Conversion Cycle Time (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Icon name="clock" className="w-4 h-4 text-emerald-500" />
              各阶段平均流转耗时 (天)
            </h3>
            <span className="text-xs font-mono text-emerald-500">平均成单周期: 28 天</span>
          </div>
          <div className="h-64">
            <canvas id="bi-cycle-chart" ref={cycleCanvas} />
          </div>
        </div>
      </div>
      {/* Lost Deal Reason Analysis */}
      <div className="bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Icon name="alert-circle" className="w-4 h-4 text-rose-500" />
          历史丢单归因复盘分析 (Lost Deal Reasons)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div className="text-zinc-500">采购预算不足 / 冻结</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-1">35%</div>
            <div className="text-[10px] text-zinc-400 mt-1">建议: 推出按季度或分阶段轻量订阅包</div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div className="text-zinc-500">友商低价恶性竞争</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-1">28%</div>
            <div className="text-[10px] text-zinc-400 mt-1">
              建议: 强化私有化安全与原厂 SLA 门槛
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div className="text-zinc-500">功能与技术参数不符</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-1">22%</div>
            <div className="text-[10px] text-zinc-400 mt-1">建议: 售前早期介入深度 POC 验证</div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div className="text-zinc-500">决策链变动搁置</div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-1">15%</div>
            <div className="text-[10px] text-zinc-400 mt-1">建议: 覆盖多部门 CTO 与业务副总裁</div>
          </div>
        </div>
      </div>
    </div>
  );
}
