import { useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

const PERIODS = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'quarter', label: '本季度 (Q3)' },
  { key: 'year', label: '本年度 (2026)' },
];

const SCHEDULED_REPORTS = [
  {
    id: 'rep-01',
    name: '全平台每日运营核心健康周报 (Daily Executive Summary)',
    format: 'PDF + Excel',
    frequency: '每周一 09:00',
    recipients: 'exec-team@acme.inc (6人)',
    lastGenerated: '2026-09-29 09:00',
    status: 'active',
  },
  {
    id: 'rep-02',
    name: '多租户云资源配额与成本透视表 (Multi-Tenant Cost Audit)',
    format: 'Excel (.xlsx)',
    frequency: '每月 1 日 00:00',
    recipients: 'fin-ops@acme.inc (4人)',
    lastGenerated: '2026-09-01 00:00',
    status: 'active',
  },
  {
    id: 'rep-03',
    name: '组织成员登录行为与活跃度分析 (Member Engagement Metric)',
    format: 'CSV 格式',
    frequency: '每日凌晨 02:00',
    recipients: 'hr-security@acme.inc (2人)',
    lastGenerated: '2026-09-30 02:00',
    status: 'active',
  },
  {
    id: 'rep-04',
    name: '平台可用性与 SLA 达标审计报告 (SLA Compliance Guarantee)',
    format: 'PDF 官方认证件',
    frequency: '每季度归档',
    recipients: 'audit-board@acme.inc (5人)',
    lastGenerated: '2026-07-01 00:00',
    status: 'active',
  },
];

const DEPT_DISTRIBUTION = [
  { name: '技术研发与架构中心', percentage: 42, color: 'bg-primary', hex: '#006fee', cost: '¥146,500' },
  { name: '商业化销售总装中心', percentage: 28, color: 'bg-purple-500', hex: '#7828c8', cost: '¥98,200' },
  { name: '全球市场与用户增长', percentage: 18, color: 'bg-emerald-500', hex: '#17c964', cost: '¥62,800' },
  { name: '产品体验与设计部', percentage: 8, color: 'bg-amber-500', hex: '#f5a524', cost: '¥28,400' },
  { name: '财务与法务合规中心', percentage: 4, color: 'bg-slate-400', hex: '#94a3b8', cost: '¥13,020' },
];

export default function AnalyticsReportsView() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState('30d');
  const [metricTab, setMetricTab] = useState('dau'); // 'dau' | 'api' | 'mrr'

  const handleExport = (type) => {
    showToast(`正在导出 ${period} 周期的【${type}】报表数据包...`, 'success');
  };

  const handleGenerateNow = (reportName) => {
    showToast(`报表生成任务已加入后台队列：${reportName}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* View Header with Period & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
              <Icon name="bar-chart-3" className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              企业数据报表与 BI 综合分析
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              实时数据流 · 秒级聚合
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            聚合多租户全链路活跃度、工作流吞吐、各部门资源成本消耗及定时离线报表任务。
          </p>
        </div>

        {/* Period Selector & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPeriod(p.key);
                  showToast(`统计周期已切换至：${p.label}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.key
                    ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport('Excel 数据集')}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <Icon name="file-text" className="w-3.5 h-3.5" />
              <span>导出 Excel</span>
            </button>
            <button
              onClick={() => handleExport('PDF 分析报告')}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all"
            >
              <Icon name="download" className="w-3.5 h-3.5" />
              <span>下载 PDF 报告</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metric Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">组织活跃黏性 (DAU/MAU)</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <Icon name="trending-up" className="w-3 h-3" />
              +5.8%
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            78.4%
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>行业标杆平均: 52%</span>
            <span className="text-emerald-500 font-semibold">健康度极高</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">月度经常性收入 (MRR)</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              <Icon name="trending-up" className="w-3 h-3" />
              +21.5%
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            ¥348,920
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>季度 KPI 达成率</span>
            <span className="text-primary font-semibold">114.2% 超预期</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">全球 API 网关吞吐</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
              <Icon name="zap" className="w-3 h-3" />
              -18% 延迟
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            48.6 <span className="text-xs font-normal text-zinc-400">Million</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>平均耗时: 24.6ms</span>
            <span className="text-purple-500 font-semibold">99.99% 可用</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">自动化工作流执行量</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <Icon name="trending-up" className="w-3 h-3" />
              +19.4%
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            1,428,900
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>异常失败率: 0.02%</span>
            <span className="text-emerald-500 font-semibold">稳定运行</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Left Activity Trend (7 cols) + Right Department Cost (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Activity & Request Trend (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>用户活跃度与 API 请求波动曲线</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                数据源自边缘 CDN 日志聚合与 Prometheus 监控集群
              </p>
            </div>
            {/* Metric Switcher */}
            <div className="flex items-center bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[10px] font-semibold">
              <button
                onClick={() => setMetricTab('dau')}
                className={`px-2 py-1 rounded-md transition-all ${
                  metricTab === 'dau'
                    ? 'bg-primary text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                活跃人数 (DAU)
              </button>
              <button
                onClick={() => setMetricTab('api')}
                className={`px-2 py-1 rounded-md transition-all ${
                  metricTab === 'api'
                    ? 'bg-primary text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                API 负载 (QPS)
              </button>
            </div>
          </div>

          {/* SVG Vector Interactive Chart Visual */}
          <div className="relative h-60 w-full pt-4">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#006fee" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#006fee" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartGradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7828c8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7828c8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="165" x2="500" y2="165" stroke="currentColor" strokeOpacity="0.12" />

              {/* Primary Area & Line */}
              <path
                d="M0,140 Q60,110 120,130 T240,65 T360,45 T500,20 L500,165 L0,165 Z"
                fill="url(#chartGradPrimary)"
              />
              <path
                d="M0,140 Q60,110 120,130 T240,65 T360,45 T500,20"
                fill="none"
                stroke="#006fee"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Secondary Comparison Line */}
              <path
                d="M0,155 Q80,145 150,115 T300,90 T420,80 T500,55"
                fill="none"
                stroke="#7828c8"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Key Data Point Highlights */}
              <circle cx="240" cy="65" r="4.5" fill="#006fee" className="ring-4 ring-primary/20" />
              <circle cx="360" cy="45" r="4.5" fill="#006fee" className="ring-4 ring-primary/20" />
              <circle cx="500" cy="20" r="5" fill="#17c964" />
            </svg>

            {/* Floating Point Tag */}
            <div className="absolute top-6 right-6 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-md text-[10px] space-y-0.5">
              <div className="text-zinc-400 font-medium">当前峰值: 9月30日</div>
              <div className="font-bold text-primary">48,219 活跃 / 3,420 QPS</div>
            </div>
          </div>

          {/* Bottom Time Labels */}
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono pt-1">
            <span>09-01</span>
            <span>09-08</span>
            <span>09-15</span>
            <span>09-22</span>
            <span>09-30 (今日)</span>
          </div>
        </div>

        {/* Right Chart: Department Resource & Cost Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                各部门云资源消耗与成本归集
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                当月累计支出：<span className="font-bold text-zinc-900 dark:text-zinc-100">¥348,920</span>
              </p>
            </div>
            <button
              onClick={() => showToast('已发起成本优化与闲置资源回收建议')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              优化建议
            </button>
          </div>

          {/* Stacked Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-zinc-200 dark:bg-zinc-800">
              {DEPT_DISTRIBUTION.map((item) => (
                <div
                  key={item.name}
                  className={`${item.color} h-full transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.name}: ${item.percentage}%`}
                />
              ))}
            </div>
          </div>

          {/* Department Items Breakdown */}
          <div className="space-y-2 pt-2">
            {DEPT_DISTRIBUTION.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-400 font-mono">{item.cost}</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 w-9 text-right font-mono">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduled Reports & Automation Table */}
      <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Icon name="file-text" className="w-4 h-4 text-primary" />
              <span>定时报表与自动化订阅任务 ({SCHEDULED_REPORTS.length})</span>
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              系统将根据 CRON 定时表达式自动生成数据透视附件并推送到订阅者邮箱或企业飞书/钉钉机器人。
            </p>
          </div>
          <button
            onClick={() => showToast('新建定时报表订阅向导已开启', 'info')}
            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-xs flex items-center gap-1 self-start sm:self-center"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>新建订阅规则</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
                <th className="pb-3 px-3">报表主题与描述</th>
                <th className="pb-3 px-3">产出格式</th>
                <th className="pb-3 px-3">执行周期</th>
                <th className="pb-3 px-3">接收对象</th>
                <th className="pb-3 px-3">最近产出时间</th>
                <th className="pb-3 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {SCHEDULED_REPORTS.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-white dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {report.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      Task ID: {report.id}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                      {report.format}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 font-medium">
                    {report.frequency}
                  </td>
                  <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                    {report.recipients}
                  </td>
                  <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                    {report.lastGenerated}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGenerateNow(report.name)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-primary hover:text-white text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-colors"
                      >
                        立即生成
                      </button>
                      <button
                        onClick={() => showToast(`已下载最近一次产出文件：${report.name}.pdf`)}
                        className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-primary transition-colors"
                        title="下载最新归档"
                      >
                        <Icon name="download" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
