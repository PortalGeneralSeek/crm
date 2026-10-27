import { useEffect, useRef } from 'react';
import Icon from '../../shared/Icon';
import { createRevenueChart, createTrafficChart } from './charts';

export default function ChartsSection({ active, isDark }) {
  const revenueRef = useRef(null);
  const trafficRef = useRef(null);
  const wasActive = useRef(false);

  // Charts are (re)built when the tab opens, after a short delay so the canvases have a size,
  // and immediately on a theme change while the tab is showing.
  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return undefined;
    }
    let charts = [];
    const build = () => {
      charts = [
        createRevenueChart(revenueRef.current, isDark),
        createTrafficChart(trafficRef.current, isDark),
      ];
    };
    let timer;
    if (wasActive.current) build();
    else timer = setTimeout(build, 50);
    wasActive.current = true;
    return () => {
      clearTimeout(timer);
      charts.forEach((chart) => chart.destroy());
    };
  }, [active, isDark]);

  return (
    <section id="section-charts" className={`tab-section space-y-10${active ? '' : ' hidden'}`}>
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-lg bg-blue-500/10 text-primary">
              <Icon name="line-chart" className="w-6 h-6" />
            </span>
            Charts & Analytics 数据可视化组件
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            复刻 Figma Page 7 (Charts) 中的 Linear Graph、TrendGraph、Bars、Pie、Gauge
            及数据指标卡片。
          </p>
        </div>
        <button className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 self-start">
          <Icon name="copy" className="w-4 h-4" />
          复制图表模块代码
        </button>
      </div>
      {/* Stats Cards Top Row (Node 126:23459) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-[#16171a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>总营收 (Total Revenue)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
              +14.2%
            </span>
          </div>
          <div className="text-2xl font-bold">¥284,930.00</div>
          <p className="text-[11px] text-zinc-400">较上月同比增加 ¥34,200</p>
        </div>
        {/* Stat 2 */}
        <div className="bg-white dark:bg-[#16171a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>活跃用户 (Active Users)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
              +8.7%
            </span>
          </div>
          <div className="text-2xl font-bold">48,219</div>
          <p className="text-[11px] text-zinc-400">实时在线 1,420 人</p>
        </div>
        {/* Stat 3 */}
        <div className="bg-white dark:bg-[#16171a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>转化率 (Conversion Rate)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-danger/10 text-danger">
              -0.8%
            </span>
          </div>
          <div className="text-2xl font-bold">3.48%</div>
          <p className="text-[11px] text-zinc-400">平均访问时长 4m 12s</p>
        </div>
        {/* Stat 4 */}
        <div className="bg-white dark:bg-[#16171a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>平均客单价 (AOV)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
              +5.3%
            </span>
          </div>
          <div className="text-2xl font-bold">¥128.50</div>
          <p className="text-[11px] text-zinc-400">订单总数 2,217 单</p>
        </div>
      </div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Line & Trend Chart (Node 121:7801 & 155:26115) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#16171a] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">营收趋势分析 (Linear Graph & Trends)</h3>
              <p className="text-xs text-zinc-400">近 6 个月实际收益 vs 目标基线</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                2026 实际
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 ml-3">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                目标基准
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <canvas id="revenueTrendChart" ref={revenueRef} />
          </div>
        </div>
        {/* Donut / Ring Graph (Node 121:6820 & 154:21888) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#16171a] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm">流量获取渠道 (Traffic Ring Chart)</h3>
            <p className="text-xs text-zinc-400">访客来源分布统计</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <canvas id="trafficDonutChart" ref={trafficRef} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-zinc-500">自然搜索 (45%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-zinc-500">直接访问 (25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-500">社交引流 (20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-500">付费广告 (10%)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
