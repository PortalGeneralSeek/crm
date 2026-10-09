import { useState, useEffect, useMemo } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { useAuth, crmApi, authStore } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

const ROLE_BADGES = {
  super_admin: { label: '超管特权', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  sales_director: { label: '销售业务总监', color: 'bg-blue-500/10 text-brand-600 dark:text-blue-400 border-blue-500/20' },
  sales_rep: { label: '一线销售经理', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  finance_auditor: { label: '财务审计合规', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
};

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
];

export default function Settings({ active }) {
  const showToast = useToast();
  const auth = useAuth();

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles' | 'audit'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permTree, setPermTree] = useState([]);
  const [loading, setLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditKeyword, setAuditKeyword] = useState('');
  const [auditModule, setAuditModule] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Selected Role for Permission Matrix
  const [selectedRoleId, setSelectedRoleId] = useState(1);
  const [selectedMenuIds, setSelectedMenuIds] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Modals
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states - Create User
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRealName, setNewRealName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState(3);
  const [newAvatar, setNewAvatar] = useState(DEFAULT_AVATARS[0]);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Form states - Edit User
  const [editRealName, setEditRealName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState(3);
  const [editPassword, setEditPassword] = useState('');

  // Form states - Create Role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, treeRes] = await Promise.all([
        crmApi.getUsers(),
        crmApi.getRoles(),
        crmApi.getPermissionsTree(),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (rolesRes.data) {
        setRoles(rolesRes.data);
        if (rolesRes.data.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesRes.data[0].id);
        }
      }
      if (treeRes.data) setPermTree(treeRes.data);
    } catch (err) {
      console.error(err);
      showToast(`获取系统数据失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      fetchData();
    }
  }, [active]);

  // Fetch assigned permissions when selected role changes
  useEffect(() => {
    if (!selectedRoleId) return;
    crmApi
      .getRolePermissions(selectedRoleId)
      .then((res) => {
        if (res.data?.assignedMenuIds) {
          setSelectedMenuIds(res.data.assignedMenuIds);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [selectedRoleId]);

  // Load audit logs
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await crmApi.getAuditLogs({
        page: auditPage,
        pageSize: 20,
        keyword: auditKeyword.trim(),
        module: auditModule,
      });
      if (res.data) {
        setAuditLogs(res.data.list || []);
        setAuditTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取审计日志失败: ${err.message}`, 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (active && activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [active, activeTab, auditPage, auditKeyword, auditModule]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const match =
          u.username.toLowerCase().includes(q) ||
          u.realName.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterRoleId && String(u.roleId) !== String(filterRoleId)) return false;
      if (filterStatus !== '' && String(u.status) !== String(filterStatus)) return false;
      return true;
    });
  }, [users, keyword, filterRoleId, filterStatus]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('用户名和密码不能为空', 'warning');
      return;
    }
    setSubmittingUser(true);
    try {
      await crmApi.createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        realName: newRealName.trim() || newUsername.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        roleId: Number(newRoleId),
        avatar: newAvatar,
      });
      showToast(`成员【${newRealName || newUsername}】新增成功，已自动关联对应角色权限！`, 'success');
      setCreateUserOpen(false);
      setNewUsername('');
      setNewPassword('123456');
      setNewRealName('');
      setNewPhone('');
      setNewEmail('');
      // Reload users
      const res = await crmApi.getUsers();
      if (res.data) setUsers(res.data);
    } catch (err) {
      showToast(`新增用户失败: ${err.message}`, 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (u) => {
    setEditingUser(u);
    setEditRealName(u.realName);
    setEditPhone(u.phone || '');
    setEditEmail(u.email || '');
    setEditRoleId(u.roleId);
    setEditPassword('');
    setEditUserOpen(true);
  };

  // Handle Save Edit User
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload = {
        realName: editRealName,
        phone: editPhone,
        email: editEmail,
        roleId: Number(editRoleId),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await crmApi.updateUser(editingUser.id, payload);
      showToast(`成员【${editRealName}】信息与权限角色分配已更新！`, 'success');
      setEditUserOpen(false);
      // Reload users
      const res = await crmApi.getUsers();
      if (res.data) setUsers(res.data);
    } catch (err) {
      showToast(`更新用户失败: ${err.message}`, 'error');
    }
  };

  // Handle Quick Role Assign
  const handleQuickRoleAssign = async (user, newRole) => {
    try {
      await crmApi.updateUser(user.id, { roleId: newRole.id });
      showToast(`已成功将【${user.realName}】角色变更为【${newRole.name}】！`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, roleId: newRole.id, role: newRole } : u))
      );
    } catch (err) {
      showToast(`分配角色失败: ${err.message}`, 'error');
    }
  };

  // Handle Toggle User Status
  const handleToggleStatus = async (user) => {
    if (user.id === 1) {
      showToast('内置超级管理员账号禁止停用', 'warning');
      return;
    }
    const nextStatus = user.status === 1 ? 0 : 1;
    try {
      await crmApi.updateUserStatus(user.id, nextStatus);
      showToast(nextStatus === 1 ? `已启用账号【${user.realName}】` : `已停用账号【${user.realName}】`, 'info');
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
    } catch (err) {
      showToast(`状态变更失败: ${err.message}`, 'error');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user) => {
    if (user.id === 1) {
      showToast('超级管理员账号不可删除', 'error');
      return;
    }
    if (!window.confirm(`确定要彻底删除成员【${user.realName}】(${user.username}) 吗？`)) return;
    try {
      await crmApi.deleteUser(user.id);
      showToast(`成员【${user.realName}】已删除`, 'info');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      showToast(`删除失败: ${err.message}`, 'error');
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (user) => {
    const pwd = window.prompt(`请输入为【${user.realName}】重置的新密码（至少 6 位）：`, '123456');
    if (!pwd) return;
    if (pwd.length < 6) {
      showToast('新密码长度不能少于 6 位', 'warning');
      return;
    }
    try {
      await crmApi.resetUserPassword(user.id, pwd);
      showToast(`已将【${user.realName}】密码重置为：${pwd}`, 'success');
    } catch (err) {
      showToast(`重置密码失败: ${err.message}`, 'error');
    }
  };

  // Handle Create Role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleCode.trim()) {
      showToast('角色名称和唯一编码不能为空', 'warning');
      return;
    }
    try {
      const res = await crmApi.createRole({
        name: newRoleName.trim(),
        code: newRoleCode.trim(),
        description: newRoleDesc.trim(),
      });
      showToast(`角色【${newRoleName}】创建成功！`, 'success');
      setCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleCode('');
      setNewRoleDesc('');
      const rolesRes = await crmApi.getRoles();
      if (rolesRes.data) {
        setRoles(rolesRes.data);
        if (res.data?.id) setSelectedRoleId(res.data.id);
      }
    } catch (err) {
      showToast(`创建角色失败: ${err.message}`, 'error');
    }
  };

  // Permission Matrix selection helpers
  const isMenuChecked = (id) => selectedMenuIds.includes(id);

  const togglePermission = (id) => {
    setSelectedMenuIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleModuleAll = (moduleNode) => {
    const allIds = [moduleNode.id, ...(moduleNode.children || []).map((c) => c.id)];
    const isAllSelected = allIds.every((id) => selectedMenuIds.includes(id));

    if (isAllSelected) {
      // Unselect all in module
      setSelectedMenuIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      // Select all in module
      setSelectedMenuIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // Save Role Permissions Matrix
  const handleSaveRolePermissions = async () => {
    setSavingPerms(true);
    try {
      await crmApi.updateRolePermissions(selectedRoleId, selectedMenuIds);
      const roleObj = roles.find((r) => r.id === selectedRoleId);
      showToast(
        `【${roleObj?.name || '当前角色'}】权限矩阵更新成功！后端已同步清空并重建 Redis 缓存。`,
        'success'
      );
      // If current logged-in user belongs to this role, refresh auth menus
      if (auth.user?.roleId === selectedRoleId) {
        const menuRes = await crmApi.getDynamicMenus();
        if (menuRes.data) {
          authStore.setSession({
            ...auth,
            menus: menuRes.data,
          });
          showToast('您当前角色的工作台菜单已实时动态重载！', 'info');
        }
      }
    } catch (err) {
      showToast(`保存权限矩阵失败: ${err.message}`, 'error');
    } finally {
      setSavingPerms(false);
    }
  };

  const currentRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md">
                <Icon name="shield-check" className="w-5 h-5 text-white" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-blue-200">
                Enterprise RBAC Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              系统成员管理与权限分配矩阵
            </h1>
            <p className="text-sm text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
              基于角色访问控制模型（RBAC），集中化管理团队成员、登录凭证、角色继承与细粒度按钮、价格字段授权。
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 text-center min-w-[90px]">
              <div className="text-2xl font-black">{users.length}</div>
              <div className="text-[11px] text-blue-200 font-medium">企业成员</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 text-center min-w-[90px]">
              <div className="text-2xl font-black">{roles.length}</div>
              <div className="text-[11px] text-blue-200 font-medium">配置角色</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 text-center min-w-[90px]">
              <div className="text-2xl font-black">59</div>
              <div className="text-[11px] text-blue-200 font-medium">细粒度控制点</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon name="users" className="w-4 h-4" />
            <span>成员账号管理 ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon name="lock" className="w-4 h-4" />
            <span>角色权限矩阵配置 ({roles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon name="file-text" className="w-4 h-4" />
            <span>操作安全审计日志 ({auditTotal})</span>
          </button>
        </div>

        {/* Action Button based on tab */}
        {activeTab === 'users' && (
          <button
            type="button"
            disabled={!auth.canAddUser}
            onClick={() => setCreateUserOpen(true)}
            title={auth.canAddUser ? '新增系统用户' : '需要 btn:user:add 权限'}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              auth.canAddUser
                ? 'bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-brand-500/20'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Icon name="user-plus" className="w-4 h-4" />
            <span>新增成员用户</span>
          </button>
        )}

        {activeTab === 'roles' && (
          <button
            type="button"
            disabled={!auth.canAddRole}
            onClick={() => setCreateRoleOpen(true)}
            title={auth.canAddRole ? '新建自定义角色' : '需要 btn:role:add 权限'}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              auth.canAddRole
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/20'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>新建自定义角色</span>
          </button>
        )}

        {activeTab === 'audit' && (
          <button
            type="button"
            onClick={loadAuditLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs"
          >
            <Icon name="refresh-cw" className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
            <span>刷新审计流水</span>
          </button>
        )}
      </div>

      {/* ================= Tab 1: 成员账号管理 ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Icon
                  name="search"
                  className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索用户名、姓名、手机号或企业邮箱..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                />
              </div>

              {/* Role Filter */}
              <Select
                value={filterRoleId}
                onChange={(val) => setFilterRoleId(val)}
                size="sm"
                variant="filter"
                options={[
                  { value: '', label: '全部所属角色' },
                  ...roles.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />

              {/* Status Filter */}
              <Select
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
                size="sm"
                variant="filter"
                options={[
                  { value: '', label: '全部账号状态' },
                  { value: '1', label: '正常 (Active)' },
                  { value: '0', label: '已停用 (Disabled)' },
                ]}
              />
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              共筛选出 <strong className="text-zinc-900 dark:text-zinc-100">{filteredUsers.length}</strong> 位成员
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">成员基本信息</th>
                    <th className="py-3 px-4">分配权限角色</th>
                    <th className="py-3 px-4">联系方式</th>
                    <th className="py-3 px-4">账号状态</th>
                    <th className="py-3 px-4">创建时间</th>
                    <th className="py-3 px-4 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-zinc-400">
                        未匹配到相关成员用户
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const badgeInfo = ROLE_BADGES[u.role?.code] || {
                        label: u.role?.name || '自定义角色',
                        color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                      };

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* User info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || DEFAULT_AVATARS[0]}
                                alt=""
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                              />
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {u.realName}
                                  {u.id === auth.user?.id && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-brand-50 dark:bg-blue-950 text-brand-600 dark:text-blue-400 font-medium">
                                      当前登录
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${badgeInfo.color}`}
                              >
                                {u.role?.name || '未指定'}
                              </span>

                              {/* Quick Role Switch dropdown */}
                              {auth.canAssignRole && (
                                <Select
                                  value={u.roleId}
                                  onChange={(val) => {
                                    const targetRole = roles.find(
                                      (r) => String(r.id) === String(val)
                                    );
                                    if (targetRole) handleQuickRoleAssign(u, targetRole);
                                  }}
                                  size="sm"
                                  variant="filter"
                                  align="right"
                                  dropdownClassName="w-44"
                                  options={roles.map((r) => ({
                                    value: r.id,
                                    label: `转为: ${r.name}`,
                                  }))}
                                />
                              )}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-4">
                            <div className="text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                              {u.phone || '未绑定手机'}
                            </div>
                            <div className="text-zinc-400 text-[11px] truncate max-w-[160px]">
                              {u.email || '未绑定邮箱'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {u.status === 1 ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                正常可用
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                已停用
                              </span>
                            )}
                          </td>

                          {/* CreatedAt */}
                          <td className="py-3 px-4 text-zinc-400 text-[11px] font-mono">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '预置'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit / Assign */}
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="编辑资料与角色分配"
                              >
                                <Icon name="edit-3" className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Status */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.status === 1
                                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                                title={u.status === 1 ? '停用账号' : '启用账号'}
                              >
                                <Icon
                                  name={u.status === 1 ? 'eye-off' : 'eye'}
                                  className="w-3.5 h-3.5"
                                />
                              </button>

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => handleResetPassword(u)}
                                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                title="重置登录密码"
                              >
                                <Icon name="key-round" className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              {u.id !== 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="删除用户账号"
                                >
                                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= Tab 2: 角色权限矩阵配置 ================= */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Roles list */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
              企业权限角色 ({roles.length})
            </div>

            {roles.map((r) => {
              const isSelected = r.id === selectedRoleId;
              const badge = ROLE_BADGES[r.code] || {
                label: '自定义角色',
                color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
              };

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-brand-50/70 dark:bg-blue-950/40 border-brand-500 shadow-md ring-2 ring-brand-500/20'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {r.name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mb-2">code: {r.code}</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {r.description || '暂无角色描述'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      已关联成员:{' '}
                      <strong className="text-zinc-700 dark:text-zinc-300">
                        {users.filter((u) => u.roleId === r.id).length} 人
                      </strong>
                    </span>
                    <span className="text-brand-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <span>配置权限</span>
                      <Icon name="arrow-right" className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Permission Matrix Matrix Tree */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
            {/* Header of selected role */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {currentRole?.name} 权限策略矩阵
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {currentRole?.code}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  当前勾选授予 <strong className="text-brand-600 dark:text-blue-400">{selectedMenuIds.length}</strong> / 59 项权限点
                </p>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingPerms || !auth.canManageRoles}
                  onClick={handleSaveRolePermissions}
                  title={auth.canManageRoles ? '保存授权配置' : '需要 btn:role:edit 权限'}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    auth.canManageRoles
                      ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 active:scale-95'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  <Icon name="check" className="w-4 h-4" />
                  <span>{savingPerms ? '正在下发策略...' : '保存授权策略'}</span>
                </button>
              </div>
            </div>

            {/* Matrix Categories */}
            <div className="space-y-4">
              {permTree.map((mod) => {
                const isModChecked = isMenuChecked(mod.id);
                const allChildIds = (mod.children || []).map((c) => c.id);
                const selectedChildCount = allChildIds.filter((id) => selectedMenuIds.includes(id)).length;
                const isAllSelected = isModChecked && selectedChildCount === allChildIds.length;

                return (
                  <div
                    key={mod.id}
                    className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-3"
                  >
                    {/* Module Title & Menu Check */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isModChecked}
                          onChange={() => togglePermission(mod.id)}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span>{mod.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-brand-600 dark:text-blue-400 font-mono">
                            菜单访问权
                          </span>
                        </span>
                      </label>

                      {/* Quick Select all in module */}
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(mod)}
                        className="text-[11px] text-brand-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {isAllSelected ? '全取消' : '全选本模块'}
                      </button>
                    </div>

                    {/* Children: Buttons & Price Fields */}
                    {mod.children && mod.children.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {mod.children.map((btn) => {
                          const isBtnChecked = isMenuChecked(btn.id);
                          const isPriceField = btn.type === 'F';

                          return (
                            <label
                              key={btn.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                isBtnChecked
                                  ? isPriceField
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium'
                                    : 'bg-white dark:bg-zinc-900 border-brand-500/40 text-brand-600 dark:text-blue-400 font-medium shadow-2xs'
                                  : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isBtnChecked}
                                onChange={() => togglePermission(btn.id)}
                                className={`w-3.5 h-3.5 rounded ${
                                  isPriceField ? 'text-amber-500' : 'text-brand-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1 truncate">
                                <span>{btn.title}</span>
                                {isPriceField && (
                                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                                    价格敏感
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= Tab 3: 操作安全审计日志 ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Icon
                  name="search"
                  className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  type="text"
                  value={auditKeyword}
                  onChange={(e) => {
                    setAuditKeyword(e.target.value);
                    setAuditPage(1);
                  }}
                  placeholder="搜索操作人、动作或明细详情..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <Select
                value={auditModule}
                onChange={(val) => {
                  setAuditModule(val);
                  setAuditPage(1);
                }}
                size="sm"
                variant="filter"
                options={[
                  { value: '', label: '全部业务模块' },
                  { value: '认证服务', label: '认证服务 (Auth)' },
                  { value: '商机管理', label: '商机管理 (Deals)' },
                  { value: '线索管理', label: '线索管理 (Leads)' },
                  { value: '客户管理', label: '客户管理 (Customers)' },
                  { value: '合同管理', label: '合同管理 (Contracts)' },
                  { value: '回款管理', label: '回款管理 (Payments)' },
                  { value: '产品管理', label: '产品管理 (Products)' },
                  { value: '用户管理', label: '用户管理 (Users)' },
                  { value: '权限管理', label: '权限管理 (RBAC)' },
                  { value: 'AI 智能体', label: 'AI 销售智能体 (Copilot)' },
                ]}
              />
            </div>

            <div className="text-xs text-zinc-400">
              共记录审计操作流水: <span className="font-bold text-brand-600 font-mono">{auditTotal}</span> 条
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
            {auditLoading ? (
              <div className="py-16 text-center text-xs text-zinc-400">
                <Icon name="loader" className="w-5 h-5 mx-auto mb-2 animate-spin text-brand-500" />
                正在加载系统操作安全审计日志...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400">
                <Icon name="shield-check" className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
                暂无符合条件的审计日志记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-400 border-b border-zinc-200/80 dark:border-zinc-800 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">操作时间</th>
                      <th className="py-3 px-4">操作人 (账号 / 角色)</th>
                      <th className="py-3 px-4">业务模块</th>
                      <th className="py-3 px-4">操作动作</th>
                      <th className="py-3 px-4">请求路由</th>
                      <th className="py-3 px-4">来源 IP</th>
                      <th className="py-3 px-4">操作详情摘要</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {log.username}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-medium">
                            {log.roleName || '系统用户'}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 border border-brand-500/20">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                              log.method === 'POST'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : log.method === 'PUT'
                                ? 'bg-amber-500/10 text-amber-600'
                                : log.method === 'DELETE'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {log.method}
                          </span>
                          <span className="text-zinc-500">{log.path}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                          {log.ip || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 max-w-xs truncate" title={log.details}>
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {auditTotal > 20 && (
              <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                <div>
                  第 <span className="font-bold text-zinc-800 dark:text-zinc-200">{auditPage}</span> 页 / 共 {Math.ceil(auditTotal / 20)} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    disabled={auditPage >= Math.ceil(auditTotal / 20)}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= Create User Modal ================= */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                  <Icon name="user-plus" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  新增成员账号并分配权限角色
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateUserOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    登录用户名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="如: alex_sales"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    初始密码 *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  成员真实姓名 *
                </label>
                <input
                  type="text"
                  required
                  value={newRealName}
                  onChange={(e) => setNewRealName(e.target.value)}
                  placeholder="如: 张三 (高级客户经理)"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  分配权限角色 *
                </label>
                <Select
                  value={newRoleId}
                  onChange={(val) => setNewRoleId(val)}
                  fullWidth
                  size="md"
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.code})`,
                  }))}
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  新用户将立即继承该角色的全部菜单、按钮与价格查看权限。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="13800000000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    企业邮箱
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@acme.com"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  选择默认头像
                </label>
                <div className="flex items-center gap-2">
                  {DEFAULT_AVATARS.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt=""
                      onClick={() => setNewAvatar(av)}
                      className={`w-9 h-9 rounded-xl object-cover cursor-pointer transition-all ${
                        newAvatar === av
                          ? 'ring-2 ring-brand-500 scale-105 shadow-xs'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20"
                >
                  {submittingUser ? '正在创建...' : '确认创建并授权'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Edit User Modal ================= */}
      {editUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-brand-600 flex items-center justify-center">
                  <Icon name="edit-3" className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  编辑成员信息与分配角色
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditUserOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl flex items-center gap-3">
                <img
                  src={editingUser.avatar || DEFAULT_AVATARS[0]}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    @{editingUser.username}
                  </div>
                  <div className="text-[11px] text-zinc-400">系统内部唯一用户标识</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  真实姓名
                </label>
                <input
                  type="text"
                  required
                  value={editRealName}
                  onChange={(e) => setEditRealName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  重新分配所属角色
                </label>
                <Select
                  value={editRoleId}
                  onChange={(val) => setEditRoleId(val)}
                  fullWidth
                  size="md"
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.code})`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    电话
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  重置密码 (留空则保持不变)
                </label>
                <input
                  type="password"
                  placeholder="不修改请留空"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Create Role Modal ================= */}
      {createRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                创建企业自定义角色
              </h3>
              <button
                type="button"
                onClick={() => setCreateRoleOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  角色名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 华北大区区域经理"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  角色标识编码 * (英文/下划线)
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: regional_manager_north"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  职责与权限描述
                </label>
                <textarea
                  rows={3}
                  placeholder="描述该角色的权限范畴及业务审批权..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateRoleOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20"
                >
                  确认创建角色
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
