import { useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

const DEPARTMENTS = [
  {
    id: 'dept-eng',
    name: '技术研发与架构中心 (Engineering)',
    code: 'ENG-01',
    head: '张伟 (Alex Zhang)',
    headAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    headRole: '技术 VP / 首席架构师',
    count: 42,
    quota: 50,
    color: 'from-blue-600 to-indigo-600',
    tags: ['微服务', 'React 19', '高可用', 'CI/CD'],
    description: '负责核心 SaaS 平台底层微服务、多租户架构演进与前端设计系统研发。',
  },
  {
    id: 'dept-mkt',
    name: '全球市场与用户增长部 (Growth)',
    code: 'MKT-02',
    head: '林雪 (Sherry Lin)',
    headAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    headRole: '增长负责人 / CMO',
    count: 28,
    quota: 35,
    color: 'from-purple-600 to-pink-600',
    tags: ['公域获客', 'SEO矩阵', '营销自动化'],
    description: '主导海内外品牌营销落地页推广、线索培育漏斗以及全渠道获客模型迭代。',
  },
  {
    id: 'dept-sales',
    name: '商业化与大客户销售中心 (Sales)',
    code: 'SALES-03',
    head: '陈明 (Michael Chen)',
    headAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
    headRole: '商业化销售总监',
    count: 36,
    quota: 40,
    color: 'from-amber-500 to-orange-600',
    tags: ['KA客户', '领航CRM', '方案交付'],
    description: '负责企业级大客户拓展、合同签署、回款生命周期管理与售前技术解决方案。',
  },
  {
    id: 'dept-design',
    name: '产品体验与设计系统部 (Design)',
    code: 'DES-04',
    head: 'Sarah Jenkins',
    headAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    headRole: '体验设计总监',
    count: 16,
    quota: 20,
    color: 'from-emerald-500 to-teal-600',
    tags: ['Figma Tokens', 'UI/UX', '无障碍设计'],
    description: '构建 Acme Pro Design System 设计资产、统一交互规范与跨端视觉体验。',
  },
  {
    id: 'dept-finance',
    name: '财务合规与法务支持部 (Finance)',
    code: 'FIN-05',
    head: '王建国 (David Wang)',
    headAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    headRole: '法务合规顾问',
    count: 6,
    quota: 10,
    color: 'from-slate-600 to-zinc-700',
    tags: ['SOC2合规', '发票审计', '法务审核'],
    description: '保障企业财务流水合规、数据出境安全审查及 SOC2 / GDPR 标准审计。',
  },
];

const INITIAL_ROLES = [
  {
    id: 'super-admin',
    name: '超级管理员 (Super Admin)',
    badge: '全局特权',
    badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20',
    membersCount: 3,
    description: '拥有系统所有最高控制权，不受任何权限边界与访问策略限制。',
    isProtected: true,
  },
  {
    id: 'team-lead',
    name: '部门负责人 (Team Lead)',
    badge: '业务管控',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    membersCount: 12,
    description: '管理所属部门的组织架构、审批敏感流程、查看团队数据报表。',
    isProtected: false,
  },
  {
    id: 'senior-dev',
    name: '高级研发架构师 (Senior Dev)',
    badge: '核心技术',
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    membersCount: 38,
    description: '负责核心代码仓库提交、微服务环境调优、云原生流水线管理。',
    isProtected: false,
  },
  {
    id: 'biz-operator',
    name: '商业运营专员 (Biz Operator)',
    badge: '业务协同',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    membersCount: 65,
    description: '线索跟进、客户 360° 视图查看、日常协同与营销物料发布。',
    isProtected: false,
  },
  {
    id: 'auditor',
    name: '合规审计员 (Auditor)',
    badge: '只读合规',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    membersCount: 10,
    description: '专职安全合规审计，只读访问操作日志、财务凭证与系统配置快照。',
    isProtected: false,
  },
];

const PERMISSION_GROUPS = [
  {
    category: '系统与工作区治理',
    icon: 'layout-grid',
    items: [
      { id: 'workspace.edit', label: '修改企业工作区基本配置与品牌域名', risk: 'high' },
      { id: 'sso.manage', label: '配置 SAML 2.0 / OIDC 单点登录集成', risk: 'critical' },
      { id: 'dept.manage', label: '新增、重组或解散组织架构与部门', risk: 'medium' },
      { id: 'quota.recharge', label: '云资源配额充值与订阅方案升降级', risk: 'medium' },
    ],
  },
  {
    category: '用户身份与凭据治理',
    icon: 'users',
    items: [
      { id: 'member.invite', label: '向外部邮箱下发成员邀请链接', risk: 'low' },
      { id: 'member.roles', label: '调整成员归属角色与继承策略', risk: 'high' },
      { id: 'member.mfa_reset', label: '重置成员 2FA 双因素密钥与安全密码', risk: 'high' },
      { id: 'member.kick', label: '强制注销离职成员所有在线会话', risk: 'medium' },
    ],
  },
  {
    category: '数据报表与敏感导出',
    icon: 'bar-chart-3',
    items: [
      { id: 'data.export_all', label: '批量导出全量客户与财务脱敏数据', risk: 'critical' },
      { id: 'data.view_analytics', label: '查看核心商业收入与 ROI 报表', risk: 'medium' },
      { id: 'data.custom_bi', label: '创建与编辑自定义 BI 看板任务', risk: 'low' },
    ],
  },
  {
    category: '安全合规与审计跟踪',
    icon: 'shield',
    items: [
      { id: 'audit.view_logs', label: '检索与导出系统级安全操作审计日志', risk: 'medium' },
      { id: 'security.ip_whitelist', label: '维护企业局域网可信 IP 白名单规则', risk: 'critical' },
      { id: 'security.api_keys', label: '生成、吊销与轮换生产环境 API 密钥', risk: 'critical' },
    ],
  },
];

// Initial matrix state: map roleId -> Set of permission IDs
const DEFAULT_MATRIX = {
  'super-admin': new Set([
    'workspace.edit', 'sso.manage', 'dept.manage', 'quota.recharge',
    'member.invite', 'member.roles', 'member.mfa_reset', 'member.kick',
    'data.export_all', 'data.view_analytics', 'data.custom_bi',
    'audit.view_logs', 'security.ip_whitelist', 'security.api_keys',
  ]),
  'team-lead': new Set([
    'dept.manage', 'member.invite', 'member.roles', 'data.view_analytics',
    'data.custom_bi', 'audit.view_logs',
  ]),
  'senior-dev': new Set([
    'member.invite', 'data.custom_bi', 'security.api_keys', 'audit.view_logs',
  ]),
  'biz-operator': new Set([
    'member.invite', 'data.view_analytics',
  ]),
  'auditor': new Set([
    'data.view_analytics', 'audit.view_logs',
  ]),
};

export default function RolesAndOrgView() {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState('org'); // 'org' | 'roles' | 'matrix'
  const [selectedRoleId, setSelectedRoleId] = useState('team-lead');
  const [matrix, setMatrix] = useState(() => ({
    'super-admin': new Set(DEFAULT_MATRIX['super-admin']),
    'team-lead': new Set(DEFAULT_MATRIX['team-lead']),
    'senior-dev': new Set(DEFAULT_MATRIX['senior-dev']),
    'biz-operator': new Set(DEFAULT_MATRIX['biz-operator']),
    'auditor': new Set(DEFAULT_MATRIX['auditor']),
  }));
  const [searchDept, setSearchDept] = useState('');
  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState({ name: '', head: '', quota: '30' });

  const activeRole = INITIAL_ROLES.find((r) => r.id === selectedRoleId) || INITIAL_ROLES[1];

  const togglePermission = (roleId, permId, permLabel) => {
    if (roleId === 'super-admin') {
      showToast('超级管理员拥有内置最高特权，不可关闭基础权限', 'info');
      return;
    }
    setMatrix((prev) => {
      const currentSet = new Set(prev[roleId]);
      const willEnable = !currentSet.has(permId);
      if (willEnable) {
        currentSet.add(permId);
        showToast(`已为【${activeRole.name}】开通：${permLabel}`, 'success');
      } else {
        currentSet.delete(permId);
        showToast(`已收回【${activeRole.name}】的权限：${permLabel}`, 'info');
      }
      return { ...prev, [roleId]: currentSet };
    });
  };

  const handleCreateDept = (e) => {
    e.preventDefault();
    if (!newDeptForm.name.trim()) return;
    showToast(`新建组织部门成功：${newDeptForm.name} (编制: ${newDeptForm.quota}人)`, 'success');
    setShowNewDeptModal(false);
    setNewDeptForm({ name: '', head: '', quota: '30' });
  };

  const filteredDepts = DEPARTMENTS.filter(
    (d) =>
      d.name.toLowerCase().includes(searchDept.toLowerCase()) ||
      d.head.toLowerCase().includes(searchDept.toLowerCase()) ||
      d.code.toLowerCase().includes(searchDept.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
              <Icon name="users" className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              成员权限与组织架构治理
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              128 名在职成员
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            企业级 RBAC 基于角色的权限访问控制模型，支持部门多级树形层级管理与细粒度权限动态授权。
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            onClick={() => setSubTab('org')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'org'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Icon name="building-2" className="w-3.5 h-3.5" />
            <span>组织架构与部门 ({DEPARTMENTS.length})</span>
          </button>
          <button
            onClick={() => setSubTab('roles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'roles'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Icon name="shield-check" className="w-3.5 h-3.5" />
            <span>角色与权限矩阵 (RBAC)</span>
          </button>
        </div>
      </div>

      {/* Sub-view 1: Organization & Departments */}
      {subTab === 'org' && (
        <div className="space-y-6">
          {/* Action & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon
                name="search"
                className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                placeholder="搜索部门名称、部门编号或负责人..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast('组织架构图谱导出中 (SVG/PDF)...')}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span>导出架构图</span>
              </button>
              <button
                onClick={() => setShowNewDeptModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>新建子部门</span>
              </button>
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepts.map((dept) => {
              const percentage = Math.round((dept.count / dept.quota) * 100);
              return (
                <div
                  key={dept.id}
                  className="rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/90 dark:border-zinc-800/90 p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                            {dept.code}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                          {dept.name}
                        </h4>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${dept.color} flex items-center justify-center text-white text-xs font-bold shadow-xs`}
                      >
                        <Icon name="building-2" className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {dept.description}
                    </p>

                    {/* Department Head */}
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
                      <img
                        src={dept.headAvatar}
                        alt={dept.head}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {dept.head}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">{dept.headRole}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        负责人
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {dept.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quota Progress Bar & Footer */}
                  <div className="mt-5 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-zinc-500 dark:text-zinc-400">在册成员编制</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {dept.count}{' '}
                        <span className="text-zinc-400 font-normal">/ {dept.quota} 人</span>
                        <span className="ml-1.5 text-[10px] text-primary font-semibold">
                          ({percentage}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => showToast(`已筛选查看【${dept.name}】的成员名单`)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>查看成员</span>
                        <Icon name="arrow-right" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => showToast(`已打开【${dept.name}】配置面板`)}
                        className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="部门设置"
                      >
                        <Icon name="sliders" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-view 2: RBAC Roles & Permission Matrix */}
      {subTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles Selector Column (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                系统预设角色 ({INITIAL_ROLES.length})
              </span>
              <button
                onClick={() => showToast('自定义角色模板创建功能已就绪')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Icon name="plus" className="w-3 h-3" />
                <span>新建角色</span>
              </button>
            </div>

            <div className="space-y-2">
              {INITIAL_ROLES.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const grantedCount = matrix[role.id]?.size || 0;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-sm'
                        : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {role.name}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${role.badgeColor}`}
                      >
                        {role.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      {role.description}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] text-zinc-400">
                      <span>包含 {role.membersCount} 名成员</span>
                      <span className="font-semibold text-primary">
                        已授权 {grantedCount} 项策略
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matrix Switchboard (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    【{activeRole.name}】细粒度权限配置
                  </h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${activeRole.badgeColor}`}
                  >
                    {activeRole.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  所有权限变更将通过 WebSocket 即时下发，受影响用户无需重新登录即可生效。
                </p>
              </div>
              <button
                onClick={() => {
                  showToast(`已重置【${activeRole.name}】为官方出厂安全基准策略`, 'info');
                  setMatrix((prev) => ({
                    ...prev,
                    [selectedRoleId]: new Set(DEFAULT_MATRIX[selectedRoleId]),
                  }));
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 transition-colors self-start sm:self-center"
              >
                <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
                <span>重置为默认</span>
              </button>
            </div>

            {/* Permission Group Categories */}
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.category} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <Icon name={group.icon} className="w-4 h-4 text-primary" />
                    <span>{group.category}</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
                    {group.items.map((item) => {
                      const enabled = matrix[selectedRoleId]?.has(item.id) || false;
                      const isSuper = selectedRoleId === 'super-admin';
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                {item.label}
                              </span>
                              {item.risk === 'critical' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
                                  高危敏感
                                </span>
                              )}
                              {item.risk === 'high' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                                  重要权限
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">ID: {item.id}</div>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            disabled={isSuper}
                            onClick={() => togglePermission(selectedRoleId, item.id, item.label)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              enabled ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                            } ${isSuper ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Department */}
      {showNewDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="building-2" className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  新建企业组织子部门
                </h3>
              </div>
              <button
                onClick={() => setShowNewDeptModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  部门全称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：AI 基础架构与模型评测组"
                  value={newDeptForm.name}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  指定部门负责人
                </label>
                <input
                  type="text"
                  placeholder="例如：Alex Zhang (张伟)"
                  value={newDeptForm.head}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, head: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  初始编制上限 (人)
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={newDeptForm.quota}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, quota: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
