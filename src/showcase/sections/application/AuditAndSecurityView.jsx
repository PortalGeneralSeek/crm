import { useState } from 'react';
import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

const INITIAL_AUDIT_LOGS = [
  {
    id: 'evt-9021',
    timestamp: '2026-09-30 14:48:12',
    user: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    role: 'Super Admin',
    action: '调整角色权限策略',
    category: 'permission',
    resource: 'Role: Senior Dev (研发架构师)',
    ip: '116.228.89.12',
    location: '中国 · 上海 (专线直连)',
    risk: 'high',
    status: 'success',
    detail: {
      requestId: 'req_84f920da7c',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      changes: '已开启 [security.api_keys] 生产环境密钥轮换权限',
    },
  },
  {
    id: 'evt-9020',
    timestamp: '2026-09-30 14:35:04',
    user: '陈明 (Michael Chen)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
    role: '销售总监',
    action: '批量导出敏感客户账单',
    category: 'export',
    resource: 'Dataset: 2026_Q3_Deals_Full.csv',
    ip: '180.167.12.98',
    location: '中国 · 杭州',
    risk: 'critical',
    status: 'success',
    detail: {
      requestId: 'req_62a11b789e',
      userAgent: 'Chrome/128.0.0.0 (Windows NT 10.0; Win64)',
      changes: '共导出 1,420 条商机交易记录，已加注隐式盲水印',
    },
  },
  {
    id: 'evt-9019',
    timestamp: '2026-09-30 13:12:45',
    user: '未知访客 (Unknown)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    role: '外部探测源',
    action: '异地多次暴力密码爆破',
    category: 'auth',
    resource: 'Endpoint: /api/v2/auth/login',
    ip: '45.154.255.89',
    location: '欧洲 · 荷兰 (Tor节点)',
    risk: 'critical',
    status: 'blocked',
    detail: {
      requestId: 'req_99c301bb22',
      userAgent: 'python-requests/2.31.0',
      changes: '连续触发 5 次密码错误，WAF 安全网关已将该 IP 永久拉黑',
    },
  },
  {
    id: 'evt-9018',
    timestamp: '2026-09-30 11:20:18',
    user: '林雪 (Sherry Lin)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: '增长负责人',
    action: '修改 SSO 单点登录配置',
    category: 'config',
    resource: 'SAML IdP: Okta Enterprise',
    ip: '116.228.89.12',
    location: '中国 · 上海',
    risk: 'high',
    status: 'success',
    detail: {
      requestId: 'req_14e55a80f1',
      userAgent: 'Safari/18.0 (macOS)',
      changes: '更新 SAML 签名 X.509 证书有效期限至 2028-09-30',
    },
  },
  {
    id: 'evt-9017',
    timestamp: '2026-09-30 09:05:32',
    user: '张伟 (Alex Zhang)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    role: '技术 VP',
    action: '生产环境 API 密钥生成',
    category: 'api_key',
    resource: 'Token: sk_live_89a***c28e',
    ip: '116.228.89.12',
    location: '中国 · 上海',
    risk: 'high',
    status: 'success',
    detail: {
      requestId: 'req_77d201af84',
      userAgent: 'curl/8.7.1',
      changes: '创建用于 CI/CD 构建流水线的只读服务令牌，有效周期 90 天',
    },
  },
  {
    id: 'evt-9016',
    timestamp: '2026-09-29 22:40:11',
    user: '王建国 (David Wang)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    role: '法务合规顾问',
    action: '导出年度 SOC2 合规自查报告',
    category: 'export',
    resource: 'Document: SOC2_Compliance_Audit.pdf',
    ip: '180.167.12.98',
    location: '中国 · 杭州',
    risk: 'low',
    status: 'success',
    detail: {
      requestId: 'req_33b876ca19',
      userAgent: 'Edge/128.0 (Windows NT 10.0)',
      changes: '已下载通过第三方独立审计的 SOC2 Type II 合规认证文件',
    },
  },
];

const INITIAL_IP_RULES = [
  { id: 'ip-1', name: '上海研发总部企业专线', cidr: '116.228.89.0/24', type: 'allow', enabled: true, note: '主千兆专线出口' },
  { id: 'ip-2', name: '杭州商业运营中心专线', cidr: '180.167.12.0/24', type: 'allow', enabled: true, note: '销售与客服办公网段' },
  { id: 'ip-3', name: '全国内网安全 VPN 网段', cidr: '10.240.0.0/16', type: 'allow', enabled: true, note: 'WireGuard 运维跳板机' },
  { id: 'ip-4', name: '恶意扫描与爬虫封禁列表', cidr: '45.154.255.0/24', type: 'block', enabled: true, note: '已触发 WAF 封锁规则' },
];

export default function AuditAndSecurityView() {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState('audit'); // 'audit' | 'policies' | 'ip'
  const [searchLog, setSearchLog] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [activeLogModal, setActiveLogModal] = useState(null);

  // Security Policy States
  const [policies, setPolicies] = useState({
    mfaEnforced: true,
    sessionTimeout: '30m',
    dynamicWatermark: true,
    passwordRotation: true,
    restrictCorporateEmail: true,
    abnormalLoginAlert: true,
  });

  const [ipRules, setIpRules] = useState(INITIAL_IP_RULES);
  const [showNewIpModal, setShowNewIpModal] = useState(false);
  const [newIpForm, setNewIpForm] = useState({ name: '', cidr: '', type: 'allow', note: '' });

  const togglePolicy = (key, label) => {
    setPolicies((prev) => {
      const nextVal = !prev[key];
      showToast(`安全策略已更新：【${label}】设置为【${nextVal ? '强制开启' : '关闭'}】`, nextVal ? 'success' : 'info');
      return { ...prev, [key]: nextVal };
    });
  };

  const toggleIpRule = (id, name) => {
    setIpRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const next = !r.enabled;
          showToast(`IP 访问规则【${name}】状态已变更为：${next ? '启用' : '禁用'}`);
          return { ...r, enabled: next };
        }
        return r;
      })
    );
  };

  const handleAddIpRule = (e) => {
    e.preventDefault();
    if (!newIpForm.name.trim() || !newIpForm.cidr.trim()) return;
    const newRule = {
      id: `ip-${Date.now()}`,
      name: newIpForm.name,
      cidr: newIpForm.cidr,
      type: newIpForm.type,
      enabled: true,
      note: newIpForm.note || '手动新增策略',
    };
    setIpRules([newRule, ...ipRules]);
    showToast(`成功新增可信 IP 访问控制规则：${newIpForm.name} (${newIpForm.cidr})`, 'success');
    setShowNewIpModal(false);
    setNewIpForm({ name: '', cidr: '', type: 'allow', note: '' });
  };

  const filteredLogs = INITIAL_AUDIT_LOGS.filter((log) => {
    const matchSearch =
      log.user.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.ip.includes(searchLog);
    const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchRisk = riskFilter === 'all' || log.risk === riskFilter;
    return matchSearch && matchCategory && matchRisk;
  });

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Icon name="shield-check" className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              安全态势中心与全局审计日志
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
              合规态势: 98分 (A+)
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            提供全链路行为审计可追溯能力、基于 CIDR 规则的 IP 白名单拦截及企业级强制安全控制策略。
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            onClick={() => setSubTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'audit'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Icon name="file-text" className="w-3.5 h-3.5" />
            <span>实时审计日志</span>
          </button>
          <button
            onClick={() => setSubTab('policies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'policies'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Icon name="shield" className="w-3.5 h-3.5" />
            <span>企业安全策略</span>
          </button>
          <button
            onClick={() => setSubTab('ip')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'ip'
                ? 'bg-white dark:bg-zinc-700 text-primary shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Icon name="globe" className="w-3.5 h-3.5" />
            <span>可信 IP 控制 ({ipRules.length})</span>
          </button>
        </div>
      </div>

      {/* Top Security Overview Stat Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Icon name="shield-check" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">全平台合规认证态势</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>SOC2 Type II · ISO 27001</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                认证有效
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="lock" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">全员 2FA / MFA 启用率</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>100% 强制开启 (128/128)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                高强度防护
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <Icon name="alert-triangle" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-500 font-medium">今日自动阻断高危探测</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <span>127 次攻击被 WAF 实时拦截</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 font-semibold">
                0 突破
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-view 1: Audit Trail Logs */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Icon
                name="search"
                className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                placeholder="搜索操作账号、操作动作、受影响资源或 IP..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">全部分类事件</option>
                <option value="permission">权限策略调整</option>
                <option value="export">敏感数据导出</option>
                <option value="auth">身份认证与爆破</option>
                <option value="config">基础架构配置</option>
                <option value="api_key">API 密钥生命周期</option>
              </select>

              {/* Risk Filter */}
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">全部风险等级</option>
                <option value="critical">高危事件 (Critical)</option>
                <option value="high">重要操作 (High)</option>
                <option value="low">常规操作 (Low)</option>
              </select>

              {/* Export Audit Log Button */}
              <button
                onClick={() => showToast('已成功导出符合条件的审计日志快照 (.csv)', 'success')}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span>导出审计日志</span>
              </button>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-1 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium bg-zinc-100/50 dark:bg-zinc-800/40">
                    <th className="py-3 px-3">操作时间戳</th>
                    <th className="py-3 px-3">操作账号</th>
                    <th className="py-3 px-3">操作行为与类型</th>
                    <th className="py-3 px-3">受影响目标对象</th>
                    <th className="py-3 px-3">来源 IP / 地理位置</th>
                    <th className="py-3 px-3">风险等级</th>
                    <th className="py-3 px-3">结果</th>
                    <th className="py-3 px-3 text-right">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      onClick={() => setActiveLogModal(log)}
                    >
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={log.avatar}
                            alt={log.user}
                            className="w-6 h-6 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {log.user}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">{log.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 max-w-[200px] truncate">
                        {log.resource}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {log.ip}
                        </div>
                        <div className="text-[10px] text-zinc-400">{log.location}</div>
                      </td>
                      <td className="py-3 px-3">
                        {log.risk === 'critical' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
                            高危 Critical
                          </span>
                        )}
                        {log.risk === 'high' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                            重要 High
                          </span>
                        )}
                        {log.risk === 'low' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                            常规 Low
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                            <Icon name="check-circle-2" className="w-3.5 h-3.5" />
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                            <Icon name="alert-triangle" className="w-3.5 h-3.5" />
                            已阻断
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLogModal(log);
                          }}
                          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-primary transition-colors"
                        >
                          <Icon name="eye" className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: Enterprise Security Policies */}
      {subTab === 'policies' && (
        <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-6 space-y-6">
          <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                企业全局安全合规与访问防御策略
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                策略变更后将实时同步至网关拦截层，保障全链路数据机密性与防篡改。
              </p>
            </div>
            <button
              onClick={() => showToast('已保存全局策略配置并完成集群校验', 'success')}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all self-start sm:self-center"
            >
              保存策略基准
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Policy 1 */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon name="lock" className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    全员强制双因素认证 (MFA / 2FA)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  所有成员登录控制台时必须通过 Authenticator / 硬件 Security Key 完成第二重动态认证。
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePolicy('mfaEnforced', '全员强制双因素认证')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  policies.mfaEnforced ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                    policies.mfaEnforced ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 2 */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon name="clock" className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    无操作空闲会话自动超时注销
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  网页端若在指定时长内无鼠标与键盘交互，系统将自动退出登录并锁定数据视图。
                </p>
                <div className="pt-1">
                  <select
                    value={policies.sessionTimeout}
                    onChange={(e) => {
                      setPolicies({ ...policies, sessionTimeout: e.target.value });
                      showToast(`会话空闲超时已设置为：${e.target.value}`);
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium"
                  >
                    <option value="15m">15 分钟无操作锁定</option>
                    <option value="30m">30 分钟无操作锁定</option>
                    <option value="1h">1 小时无操作锁定</option>
                    <option value="4h">4 小时无操作锁定</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Policy 3 */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon name="eye" className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    动态防泄密隐形工号水印
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  在全系统敏感报表、客户名录页面背景隐蔽渲染当前操作员工号与时间戳盲水印，防截屏泄露。
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePolicy('dynamicWatermark', '动态防泄密隐形工号水印')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  policies.dynamicWatermark ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                    policies.dynamicWatermark ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Policy 4 */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon name="rotate-ccw" className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    密码复杂度与 90 天强制轮换
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  要求密码至少 12 位且含大小写字母、数字与特殊符号，过期后系统将提示阻断直至修改密码。
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePolicy('passwordRotation', '密码复杂度与90天强制轮换')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  policies.passwordRotation ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                    policies.passwordRotation ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 3: IP Access Rules */}
      {subTab === 'ip' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                可信 IP 网段与访问控制黑白名单
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                支持标准 IPv4 / IPv6 CIDR 掩码配置，对后台管理控制台发起严格网络边界准入。
              </p>
            </div>
            <button
              onClick={() => setShowNewIpModal(true)}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all self-start sm:self-center"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span>新增 CIDR 规则</span>
            </button>
          </div>

          <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 divide-y divide-zinc-200/60 dark:divide-zinc-800/60 overflow-hidden">
            {ipRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      rule.type === 'allow'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    <Icon name={rule.type === 'allow' ? 'check-circle' : 'alert-circle'} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {rule.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded font-semibold ${
                          rule.type === 'allow'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {rule.type === 'allow' ? '允许通行 (ALLOW)' : '强制拦截 (BLOCK)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-zinc-600 dark:text-zinc-300 font-semibold">
                        {rule.cidr}
                      </span>
                      <span>·</span>
                      <span>{rule.note}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => toggleIpRule(rule.id, rule.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                        : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400'
                    }`}
                  >
                    {rule.enabled ? '已生效' : '已暂停'}
                  </button>
                  <button
                    onClick={() => {
                      setIpRules(ipRules.filter((r) => r.id !== rule.id));
                      showToast(`已删除规则：${rule.name}`, 'info');
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="删除规则"
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Audit Log Detail JSON */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="file-text" className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  安全事件溯源审计详情 (Event #{activeLogModal.id})
                </h3>
              </div>
              <button
                onClick={() => setActiveLogModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div>
                  <span className="text-zinc-400 block text-[10px]">操作账号</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {activeLogModal.user} ({activeLogModal.role})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">精确时间戳</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {activeLogModal.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">来源客户端 IP</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {activeLogModal.ip}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">地理位置归属</span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {activeLogModal.location}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-zinc-500 font-semibold block mb-1">
                  变更行为摘要：
                </span>
                <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-zinc-800 dark:text-zinc-200 font-medium">
                  {activeLogModal.detail.changes}
                </div>
              </div>

              <div>
                <span className="text-zinc-500 font-semibold block mb-1">
                  请求上下文快照 (Raw Context)：
                </span>
                <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto">
{JSON.stringify(
  {
    event_id: activeLogModal.id,
    request_id: activeLogModal.detail.requestId,
    user_agent: activeLogModal.detail.userAgent,
    status: activeLogModal.status,
    risk_level: activeLogModal.risk,
  },
  null,
  2
)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setActiveLogModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add IP Rule */}
      {showNewIpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="globe" className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  新增可信 CIDR 访问规则
                </h3>
              </div>
              <button
                onClick={() => setShowNewIpModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIpRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  规则名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：北京研发中心专线网段"
                  value={newIpForm.name}
                  onChange={(e) => setNewIpForm({ ...newIpForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  CIDR 掩码格式 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：192.168.10.0/24 或单个IP 1.2.3.4/32"
                  value={newIpForm.cidr}
                  onChange={(e) => setNewIpForm({ ...newIpForm, cidr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  动作策略
                </label>
                <select
                  value={newIpForm.type}
                  onChange={(e) => setNewIpForm({ ...newIpForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                >
                  <option value="allow">允许访问 (ALLOW)</option>
                  <option value="block">阻止拦截 (BLOCK)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  备注说明
                </label>
                <input
                  type="text"
                  placeholder="例如：用于固定办公与接口对接"
                  value={newIpForm.note}
                  onChange={(e) => setNewIpForm({ ...newIpForm, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewIpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20"
                >
                  确认新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
