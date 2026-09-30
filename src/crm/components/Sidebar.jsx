import Icon from '../../shared/Icon';

const ACTIVE_ITEM =
  'sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-50 dark:bg-blue-950/60 font-semibold text-brand-600 dark:text-blue-400 transition-colors';
const INACTIVE_ITEM =
  'sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors';
// The AI item ships purple and only takes the generic inactive style after the first module switch.
const INITIAL_AI_ITEM =
  'sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors';

export default function Sidebar({ activeModule, hasNavigated, onSwitchModule }) {
  const itemClass = (key) => {
    if (key === activeModule) return ACTIVE_ITEM;
    if (key === 'ai-copilot' && !hasNavigated) return INITIAL_AI_ITEM;
    return INACTIVE_ITEM;
  };
  const handleClick = (e, key) => {
    e.preventDefault();
    onSwitchModule(key);
  };

  return (
    <aside className="w-64 flex-none bg-white dark:bg-[#121316] border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto custom-scrollbar select-none">
      <div className="p-3 space-y-6">
        {/* Group 1: 核心销售 */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            核心销售
          </div>
          <nav className="space-y-1 text-xs">
            <a
              href="#"
              onClick={(e) => handleClick(e, 'dashboard')}
              data-mod="dashboard"
              className={itemClass('dashboard')}
            >
              <Icon name="layout-dashboard" className="w-4 h-4" />
              <span className="flex-1">销售工作台</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-brand-500 text-white font-mono">
                Live
              </span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'leads')}
              data-mod="leads"
              className={itemClass('leads')}
            >
              <Icon name="target" className="w-4 h-4" />
              <span className="flex-1">线索管理</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                24
              </span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'customers')}
              data-mod="customers"
              className={itemClass('customers')}
            >
              <Icon name="building-2" className="w-4 h-4" />
              <span className="flex-1">客户与公海池</span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'deals')}
              data-mod="deals"
              className={itemClass('deals')}
            >
              <Icon name="kanban" className="w-4 h-4" />
              <span className="flex-1">商机漏斗看板</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 font-mono">
                18
              </span>
            </a>
          </nav>
        </div>
        {/* Group 2: 商务与签约 */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            商务与交易
          </div>
          <nav className="space-y-1 text-xs">
            <a
              href="#"
              onClick={(e) => handleClick(e, 'contracts')}
              data-mod="contracts"
              className={itemClass('contracts')}
            >
              <Icon name="file-check-2" className="w-4 h-4" />
              <span className="flex-1">合同与订单审批</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'payments')}
              data-mod="payments"
              className={itemClass('payments')}
            >
              <Icon name="receipt" className="w-4 h-4" />
              <span className="flex-1">回款与发票</span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'products')}
              data-mod="products"
              className={itemClass('products')}
            >
              <Icon name="calculator" className="w-4 h-4" />
              <span className="flex-1">产品与报价 (CPQ)</span>
            </a>
          </nav>
        </div>
        {/* Group 3: 数据智能 */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            数据与协同
          </div>
          <nav className="space-y-1 text-xs">
            <a
              href="#"
              onClick={(e) => handleClick(e, 'leaderboard')}
              data-mod="leaderboard"
              className={itemClass('leaderboard')}
            >
              <Icon name="trophy" className="w-4 h-4" />
              <span className="flex-1">战区业绩排行榜</span>
              <span className="text-[10px] text-amber-500 font-bold">TOP 1</span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'analytics')}
              data-mod="analytics"
              className={itemClass('analytics')}
            >
              <Icon name="pie-chart" className="w-4 h-4" />
              <span className="flex-1">销售 BI 报表</span>
            </a>
            <a
              href="#"
              onClick={(e) => handleClick(e, 'ai-copilot')}
              data-mod="ai-copilot"
              className={itemClass('ai-copilot')}
            >
              <Icon name="bot" className="w-4 h-4" />
              <span className="flex-1">AI 销售赋能助手</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-100 dark:bg-purple-900/60 font-bold text-purple-700 dark:text-purple-300">
                Beta
              </span>
            </a>
          </nav>
        </div>
      </div>
      {/* Sidebar Footer: Monthly Quota Progress Widget */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800/80 dark:to-zinc-800/40 rounded-2xl p-3.5 border border-blue-100 dark:border-zinc-700/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">本月目标进度</span>
            <span className="font-mono font-bold text-brand-600 dark:text-blue-400">82.5%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-brand-500 to-indigo-500 h-2 rounded-full"
              style={{ width: '82.5%' }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>已回款 ¥82.5万</span>
            <span>差 ¥17.5万</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-zinc-700/50 flex items-center justify-between text-[10px] text-zinc-400">
            <span>距离考核截止</span>
            <span className="font-semibold text-rose-500">倒计时 6 天</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
