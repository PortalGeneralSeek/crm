import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import Icon from '../../shared/Icon';
import {
  applySalesTrendPeriod,
  applySalesTrendTheme,
  createSalesTrendChart,
} from '../charts/salesTrend';
import { useToast } from '../hooks/useToast';

const PERIODS = [
  { key: 'month', label: '本月 (09月)' },
  { key: 'quarter', label: '本季度 (Q3)' },
  { key: 'year', label: '本年度 2026' },
];

const ACTIVE_PERIOD =
  'period-btn px-3 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-all';
const INACTIVE_PERIOD =
  'period-btn px-3 py-1.5 rounded-lg font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 transition-all';

export default function Dashboard({ ref, active, isDark, onSwitchModule, onOpenFollowup }) {
  const showToast = useToast();
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const previousDark = useRef(isDark);
  // The chart starts on yearly data while the "本月" button is highlighted.
  const [period, setPeriod] = useState('month');
  const [rowChecks, setRowChecks] = useState([false, false, false]);

  useImperativeHandle(ref, () => ({
    resizeChart: () => chartRef.current?.resize(),
  }));

  useEffect(() => {
    chartRef.current = createSalesTrendChart(canvasRef.current, isDark);
    return () => {
      chartRef.current.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previousDark.current === isDark) return;
    previousDark.current = isDark;
    if (chartRef.current) applySalesTrendTheme(chartRef.current, isDark);
  }, [isDark]);

  const handlePeriod = (key, label) => {
    setPeriod(key);
    if (!chartRef.current) return;
    applySalesTrendPeriod(chartRef.current, key);
    showToast(`已切换至: ${label}`);
  };

  return (
    <div id="module-dashboard" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Banner & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121316] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              上午好，陈明！✨
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold">
              战区排名 No.1
            </span>
          </div>
          <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            今日建议优先跟进{' '}
            <span className="font-semibold text-brand-600 dark:text-blue-400">华泰证券</span> 与{' '}
            <span className="font-semibold text-brand-600 dark:text-blue-400">大华股份</span>{' '}
            的2笔大额商机，本月有望突破 ¥1,000,000 封顶目标！
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl self-start md:self-auto text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriod(p.key, p.label)}
              className={period === p.key ? ACTIVE_PERIOD : INACTIVE_PERIOD}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card relative overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              本月完成销售额 (实际)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 flex items-center justify-center">
              <Icon name="badge-dollar-sign" className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
              ¥825,400
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <Icon name="trending-up" className="w-3.5 h-3.5 mr-0.5" />
                +18.4%
              </span>
              <span className="text-zinc-400">环比上月</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-zinc-500 dark:text-zinc-400">目标 100万</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '82.5%' }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              进行中商机金额 (Pipeline)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Icon name="layers" className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
              ¥3,420,000
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <Icon name="trending-up" className="w-3.5 h-3.5 mr-0.5" />
                +24.2%
              </span>
              <span className="text-zinc-400">活跃商机 28 个</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '68%' }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              综合赢单转化率 (Win Rate)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Icon name="check-check" className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
              42.8%
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <Icon name="arrow-up-right" className="w-3.5 h-3.5 mr-0.5" />
                +6.5%
              </span>
              <span className="text-zinc-400">高于行业均值 (28%)</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '42.8%' }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              今日待跟进事项
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Icon name="calendar-check-2" className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
              8 <span className="text-sm font-normal text-zinc-400">项待办</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-semibold font-mono text-[11px]">
                3 项高优先
              </span>
              <span className="text-zinc-400">已完成 5/13</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '38%' }} />
          </div>
        </div>
      </div>
      {/* Charts & Funnel Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Icon name="line-chart" className="w-4 h-4 text-brand-500" />
                2026 年度销售业绩趋势与月度考核目标
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                实际签约回款金额 vs 战区下达考核指标 (单位: 万元)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />
                <span className="text-zinc-600 dark:text-zinc-300 font-medium">实际销售额</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" />
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">考核目标</span>
              </div>
            </div>
          </div>
          <div className="w-full h-72">
            <canvas id="crm-sales-trend-chart" ref={canvasRef} />
          </div>
        </div>
        <div className="lg:col-span-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Icon name="filter" className="w-4 h-4 text-purple-500" />
                商机转化漏斗
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">从线索接触到赢单的转化率</p>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">
              总计 48 个
            </span>
          </div>
          <div className="space-y-3.5 my-auto">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  1. 初步接触 / 需求调研
                </span>
                <span className="font-mono text-zinc-500">22 个 · ¥480万</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  2. 方案呈现 / 技术验证
                </span>
                <span className="font-mono text-zinc-500">15 个 · ¥310万</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-500 h-3 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  3. 商务谈判 / 标书审核
                </span>
                <span className="font-mono text-zinc-500">8 个 · ¥190万</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div className="bg-purple-500 h-3 rounded-full" style={{ width: '36%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  4. 签约赢单 / 待回款
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  3 个 · ¥82.5万
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '14%' }} />
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs">
            <span className="text-purple-700 dark:text-purple-300">商务谈判阶段转化率最高</span>
            <span className="font-bold font-mono text-purple-700 dark:text-purple-300">
              68.2% ↑
            </span>
          </div>
        </div>
      </div>
      {/* Customer Table Snippet in Dashboard */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                重点客户跟进动态
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 font-semibold">
                当月 VIP 核心
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">显示近期有重大签约推进的重点企业客户</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchModule('customers')}
              className="text-xs text-brand-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              进入完整客户池管理 →
            </button>
          </div>
        </div>
        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="crm-main-table">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 uppercase font-semibold">
              <tr>
                <th scope="col" className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={(e) => setRowChecks(rowChecks.map(() => e.target.checked))}
                    className="w-3.5 h-3.5 text-brand-600 rounded"
                  />
                </th>
                <th scope="col" className="py-3.5 px-4">
                  客户企业名称
                </th>
                <th scope="col" className="py-3.5 px-4">
                  关键联系人 / 职务
                </th>
                <th scope="col" className="py-3.5 px-4">
                  进行中商机与金额
                </th>
                <th scope="col" className="py-3.5 px-4">
                  阶段状态
                </th>
                <th scope="col" className="py-3.5 px-4">
                  最近跟进记录
                </th>
                <th scope="col" className="py-3.5 px-4">
                  下次计划时间
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y divide-zinc-100 dark:divide-zinc-800/80"
              id="customer-table-body"
            >
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3.5 px-4">
                  <input
                    type="checkbox"
                    checked={rowChecks[0]}
                    onChange={(e) =>
                      setRowChecks(rowChecks.map((v, i) => (i === 0 ? e.target.checked : v)))
                    }
                    className="row-checkbox w-3.5 h-3.5 text-brand-600 rounded"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-brand-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      大华
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        浙江大华技术股份有限公司
                      </div>
                      <div className="text-[10px] text-zinc-400">智能安防 / 杭州 · A股上市公司</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">孙志宏</div>
                  <div className="text-[10px] text-zinc-400">采购副总裁 · 139****8820</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-mono font-bold text-brand-600 dark:text-blue-400">
                    ¥2,400,000
                  </div>
                  <div className="text-[10px] text-zinc-400">视频集群分析授权</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    商务谈判
                  </span>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="truncate text-zinc-600 dark:text-zinc-300">
                    昨天 16:30 法务已确认合同样本，等待周四上会终审。
                  </div>
                  <div className="text-[10px] text-zinc-400">记录人: 陈明</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px]">
                  <span className="text-rose-500 font-semibold">09-29 10:00 (明天)</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onOpenFollowup('浙江大华技术股份有限公司')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    写跟进
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3.5 px-4">
                  <input
                    type="checkbox"
                    checked={rowChecks[1]}
                    onChange={(e) =>
                      setRowChecks(rowChecks.map((v, i) => (i === 1 ? e.target.checked : v)))
                    }
                    className="row-checkbox w-3.5 h-3.5 text-brand-600 rounded"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                      华泰
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        华泰证券股份有限公司
                      </div>
                      <div className="text-[10px] text-zinc-400">金融证券 / 南京 · 头部券商</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">陈子墨</div>
                  <div className="text-[10px] text-zinc-400">资管科技总监 · 137****6612</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-mono font-bold text-brand-600 dark:text-blue-400">
                    ¥1,500,000
                  </div>
                  <div className="text-[10px] text-zinc-400">AI量化风控套件二期</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                    商务谈判
                  </span>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="truncate text-zinc-600 dark:text-zinc-300">
                    今天 10:00 完成采购价格二轮磋商，折扣降幅控制在 8% 以内。
                  </div>
                  <div className="text-[10px] text-zinc-400">记录人: 陈明</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px]">
                  <span className="text-amber-500 font-semibold">09-30 14:00</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onOpenFollowup('华泰证券股份有限公司')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    写跟进
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3.5 px-4">
                  <input
                    type="checkbox"
                    checked={rowChecks[2]}
                    onChange={(e) =>
                      setRowChecks(rowChecks.map((v, i) => (i === 2 ? e.target.checked : v)))
                    }
                    className="row-checkbox w-3.5 h-3.5 text-brand-600 rounded"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      顺丰
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        顺丰科技有限公司
                      </div>
                      <div className="text-[10px] text-zinc-400">物流科技 / 深圳 · 行业龙头</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">林国栋</div>
                  <div className="text-[10px] text-zinc-400">技术规划副总裁 · 135****9901</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-mono font-bold text-brand-600 dark:text-blue-400">
                    ¥850,000
                  </div>
                  <div className="text-[10px] text-zinc-400">智慧供应链预测引擎</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    方案呈现
                  </span>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="truncate text-zinc-600 dark:text-zinc-300">
                    提交技术白皮书与 POC 测试报告，对方架构师反馈良好。
                  </div>
                  <div className="text-[10px] text-zinc-400">记录人: 李晓鹏</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px]">
                  <span className="text-rose-500 font-semibold">今日 14:00 (急)</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onOpenFollowup('顺丰科技有限公司')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    写跟进
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
