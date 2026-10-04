import { useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';
import BatchBar from './BatchBar';
import KpiCard from './KpiCard';
import MembersTable from './MembersTable';
import MembersToolbar from './MembersToolbar';
import Sidebar from './Sidebar';
import SsoCard from './SsoCard';
import StatusFilter from './StatusFilter';
import TeamChat from './TeamChat';
import { members, searchableText } from './members';
import RolesAndOrgView from './RolesAndOrgView';
import AnalyticsReportsView from './AnalyticsReportsView';
import AuditAndSecurityView from './AuditAndSecurityView';

const KPI_BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold';

const KPIS = [
  {
    label: '活跃组织成员',
    badge: (
      <span className={`${KPI_BADGE} bg-emerald-500/10 text-emerald-500`}>
        <Icon name="trending-up" className="w-3 h-3" />
        +14.2%
      </span>
    ),
    value: '48,219',
    sparkStroke: 'stroke-emerald-500',
    sparkPath: 'M0,35 Q20,30 40,15 T80,8 T100,2',
    footNote: '较上周期增加 4,120 人',
    footTag: '环比 ↑',
  },
  {
    label: '月度经常性收入 (MRR)',
    badge: (
      <span className={`${KPI_BADGE} bg-primary/10 text-primary`}>
        <Icon name="trending-up" className="w-3 h-3" />
        +21.5%
      </span>
    ),
    value: '¥348,920',
    sparkStroke: 'stroke-primary',
    sparkPath: 'M0,32 Q25,25 45,20 T75,10 T100,4',
    footNote: '企业版付费转化率 4.8%',
    footTag: '超预期',
  },
  {
    label: 'API 服务平均延迟',
    badge: (
      <span className={`${KPI_BADGE} bg-purple-500/10 text-purple-500`}>
        <Icon name="zap" className="w-3 h-3" />
        -18.2% 优化
      </span>
    ),
    value: (
      <>
        24.6 <span className="text-xs font-normal text-zinc-400">ms</span>
      </>
    ),
    sparkStroke: 'stroke-purple-500',
    sparkPath: 'M0,10 Q25,12 50,22 T75,32 T100,36',
    footNote: '边缘 CDN 命中率 99.4%',
    footTag: '极速',
  },
  {
    label: '平台系统 SLA',
    badge: (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        正常运行
      </span>
    ),
    value: '99.99%',
    sparkStroke: 'stroke-emerald-500',
    sparkPath: 'M0,15 L30,15 L35,10 L45,20 L50,15 L100,15',
    footNote: '连续稳定运行 182 天',
    footTag: '0 事故',
  },
];

export default function ApplicationSection({ active, subView = 'overview', onSwitchSubView }) {
  const { showToast } = useToast();
  const [internalView, setInternalView] = useState('overview');
  const activeAppView = onSwitchSubView ? subView : internalView;
  const setActiveAppView = onSwitchSubView || setInternalView;
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [masterChecked, setMasterChecked] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  // The status pills and the search box each overwrite the other's effect on the rows, as in the original.
  const [rowFilter, setRowFilter] = useState({ type: 'status', value: 'all' });

  const selectAll = (checked) => {
    setMasterChecked(checked);
    setSelectedIds(checked ? new Set(members.map((m) => m.id)) : new Set());
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterByStatus = (status) => {
    setStatusFilter(status);
    setRowFilter({ type: 'status', value: status });
  };

  const search = (query) => setRowFilter({ type: 'search', value: query.toLowerCase() });

  const isHidden = (member) => {
    if (rowFilter.type === 'status') {
      return rowFilter.value !== 'all' && member.status !== rowFilter.value;
    }
    return !searchableText(member).toLowerCase().includes(rowFilter.value);
  };

  const handleBatchAction = (action) => {
    showToast(`批量操作执行完成：已对 ${selectedIds.size} 位成员执行【${action}】`, 'success');
    selectAll(false);
  };

  return (
    <section
      id="section-application"
      className={`tab-section space-y-8${active ? '' : ' hidden'}`}
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Icon name="layout-dashboard" className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              SaaS Enterprise Suite
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">
              v2.4.0
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Application 后台管理系统</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            基于 Figma Page 3 (Application) 深度还原。集成现代 SaaS
            控制台架构：全功能侧边导航、实时 KPI
            看板、带批量操作的高级数据表格、即时通讯中心与多步骤向导。
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => showToast('正在导出整套应用级 React 组件...')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="download" className="w-3.5 h-3.5" />
            导出规范
          </button>
          {/* The original's onclick called copySnippet(), which was never defined, so it did nothing. */}
          <button
            onClick={() => showToast('组件源码与 Figma 样式规范已复制到剪贴板！', 'success')}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-600 text-white shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
          >
            <Icon name="copy" className="w-3.5 h-3.5" />
            复制代码
          </button>
        </div>
      </div>

      {/* Top Row: 4 Metric KPI Cards with Inline SVG Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Main SaaS Application Shell (Sidebar + Data Canvas) */}
      <div className="bg-white dark:bg-[#141518] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          <Sidebar activeView={activeAppView} onSwitchView={setActiveAppView} />

          {/* Main Workspace Canvas (Col-9) */}
          <div className="lg:col-span-9 p-6 lg:p-8 flex flex-col space-y-6">
            {activeAppView === 'overview' && (
              <>
                <MembersToolbar onSearchKeyUp={search} />

                {/* Filter Status Pills & Floating Batch Bar Container */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <StatusFilter active={statusFilter} onChange={filterByStatus} />
                  <BatchBar count={selectedIds.size} onAction={handleBatchAction} />
                </div>

                <MembersTable
                  members={members}
                  selectedIds={selectedIds}
                  isHidden={isHidden}
                  masterChecked={masterChecked}
                  onToggleMaster={selectAll}
                  onToggleRow={toggleRow}
                />

                {/* Bottom Split: Messaging Center (Figma 92:20380) + Authentication Card (Figma 92:10559) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  <TeamChat />
                  <SsoCard />
                </div>
              </>
            )}

            {activeAppView === 'roles' && <RolesAndOrgView />}
            {activeAppView === 'analytics' && <AnalyticsReportsView />}
            {activeAppView === 'audit' && <AuditAndSecurityView />}
          </div>
        </div>
      </div>
    </section>
  );
}
