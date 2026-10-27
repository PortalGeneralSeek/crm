import { useState, useEffect, useMemo } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { crmApi, useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';
import CustomerDetailDrawer from './CustomerDetailDrawer';

const ACTIVE_TAB =
  'px-4 py-2 rounded-xl font-bold bg-white dark:bg-zinc-800 text-brand-600 dark:text-blue-400 shadow-sm transition-all border border-zinc-200/60 dark:border-zinc-700/60';
const INACTIVE_TAB =
  'px-4 py-2 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all';

const BRANCH_OPTIONS = [
  { value: '全部分公司', label: '全部分公司 · 集团全景' },
  { value: '华东分公司', label: '华东分公司 (上海/江苏/浙江)' },
  { value: '华南分公司', label: '华南分公司 (广州/深圳)' },
  { value: '华北分公司', label: '华北分公司 (北京/天津)' },
];

export default function Customers({ active, onOpenFollowup }) {
  const showToast = useToast();
  const auth = useAuth();

  // Tab: 'private' (我的/分公司私海) | 'public' (分公司客户公海池)
  const [tab, setTab] = useState('private');

  // Branch filter (default to 华东分公司)
  const [branchFilter, setBranchFilter] = useState('华东分公司');

  // Customer Lists
  const [privateList, setPrivateList] = useState([]);
  const [privateTotal, setPrivateTotal] = useState(0);
  const [publicList, setPublicList] = useState([]);
  const [publicTotal, setPublicTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [keyword, setKeyword] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Available Users for Assignment
  const [teamUsers, setTeamUsers] = useState([]);

  // Multi-select for Batch Operations
  const [selectedIds, setSelectedIds] = useState([]);

  // Reclaim Modal State
  const [reclaimModalOpen, setReclaimModalOpen] = useState(false);
  const [targetCustomerForReclaim, setTargetCustomerForReclaim] = useState(null);
  const [reclaimReason, setReclaimReason] = useState('分公司管理者手动回收重新分配');
  const [submittingReclaim, setSubmittingReclaim] = useState(false);

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetCustomerForAssign, setTargetCustomerForAssign] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Customer Detail Drawer State
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const openCustomerDetail = (cust) => {
    setSelectedCustomerForDetail(cust);
    setDetailDrawerOpen(true);
  };

  const handleCustomerUpdated = (updatedCust) => {
    setSelectedCustomerForDetail(updatedCust);
    setPrivateList((prev) =>
      prev.map((c) => (c.id === updatedCust.id ? { ...c, ...updatedCust } : c))
    );
    setPublicList((prev) =>
      prev.map((c) => (c.id === updatedCust.id ? { ...c, ...updatedCust } : c))
    );
  };

  // Create Customer Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    tier: 'KA',
    branch: '华东分公司',
    contactName: '',
    contactPhone: '',
  });

  // Fetch Team Users for Assign dropdown
  const loadTeamUsers = async () => {
    try {
      const res = await crmApi.getUsers();
      if (res.data) {
        setTeamUsers(res.data.filter((u) => u.status === 1));
      }
    } catch (e) {
      console.warn('[Customers] load users warning', e);
    }
  };

  // Fetch Customers Data
  const loadData = async (targetPage = page, targetTab = tab) => {
    setLoading(true);
    try {
      const branchParam = branchFilter === '全部分公司' ? '' : branchFilter;
      const [privRes, pubRes] = await Promise.all([
        crmApi.getCustomers({
          page: targetTab === 'private' ? targetPage : 1,
          pageSize: targetTab === 'private' ? pageSize : 15,
          poolType: 'private',
          branch: branchParam,
          keyword: keyword.trim(),
          tier: tierFilter,
        }),
        crmApi.getCustomers({
          page: targetTab === 'public' ? targetPage : 1,
          pageSize: targetTab === 'public' ? pageSize : 15,
          poolType: 'branch_public',
          branch: branchParam,
          keyword: keyword.trim(),
          tier: tierFilter,
        }),
      ]);

      if (privRes.data) {
        setPrivateList(privRes.data.list || []);
        setPrivateTotal(privRes.data.total || 0);
      }
      if (pubRes.data) {
        setPublicList(pubRes.data.list || []);
        setPublicTotal(pubRes.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取客户列表失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadData(newPage, tab);
  };

  useEffect(() => {
    if (active) {
      setPage(1);
      loadData(1, tab);
      loadTeamUsers();
    }
  }, [active, branchFilter, keyword, tierFilter, tab]);

  // Check if current user is branch manager or has reclaim/assign rights
  const isManager = auth.isBranchManager || auth.canReclaimCustomer;

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = (list) => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((item) => item.id));
    }
  };

  // Open Reclaim Modal (Single or Batch)
  const openReclaimModal = (cust = null) => {
    setTargetCustomerForReclaim(cust);
    setReclaimReason('分公司管理者手动回收重新分配');
    setReclaimModalOpen(true);
  };

  // Handle Submit Reclaim
  const handleConfirmReclaim = async () => {
    setSubmittingReclaim(true);
    try {
      if (targetCustomerForReclaim) {
        // Single Reclaim
        await crmApi.reclaimCustomer(targetCustomerForReclaim.id, reclaimReason);
        showToast(
          `客户【${targetCustomerForReclaim.name}】已成功回收至【${targetCustomerForReclaim.branch || '分公司'}】公海池！`,
          'success'
        );
      } else if (selectedIds.length > 0) {
        // Batch Reclaim
        await Promise.all(
          selectedIds.map((id) => crmApi.reclaimCustomer(id, reclaimReason))
        );
        showToast(`已批量将选中的 ${selectedIds.length} 位客户回收至分公司公海池！`, 'success');
        setSelectedIds([]);
      }
      setReclaimModalOpen(false);
      loadData();
    } catch (err) {
      showToast(`回收失败: ${err.message}`, 'error');
    } finally {
      setSubmittingReclaim(false);
    }
  };

  // Open Assign Modal (Single or Batch)
  const openAssignModal = (cust = null) => {
    setTargetCustomerForAssign(cust);
    setTargetUserId(teamUsers[0]?.id ? String(teamUsers[0].id) : '');
    setAssignNote('');
    setAssignModalOpen(true);
  };

  // Handle Submit Assign
  const handleConfirmAssign = async () => {
    if (!targetUserId) {
      showToast('请选择指定的目标负责人', 'warning');
      return;
    }
    const targetUser = teamUsers.find((u) => String(u.id) === String(targetUserId));
    setSubmittingAssign(true);
    try {
      if (targetCustomerForAssign) {
        // Single Assign
        await crmApi.assignCustomer(targetCustomerForAssign.id, Number(targetUserId), assignNote);
        showToast(
          `客户【${targetCustomerForAssign.name}】已正式分配给【${targetUser?.realName || '指定人员'}】！`,
          'success'
        );
      } else if (selectedIds.length > 0) {
        // Batch Assign
        await Promise.all(
          selectedIds.map((id) =>
            crmApi.assignCustomer(id, Number(targetUserId), assignNote)
          )
        );
        showToast(
          `已批量将 ${selectedIds.length} 位客户分配给成员【${targetUser?.realName || '指定人员'}】！`,
          'success'
        );
        setSelectedIds([]);
      }
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      showToast(`分配客户失败: ${err.message}`, 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Claim Customer from Open Sea by sales rep
  const handleClaimCustomer = async (cust) => {
    try {
      await crmApi.claimCustomer(cust.id);
      showToast(
        `您已成功从【${cust.branch}】公海认领「${cust.name}」进入「我的客户」！`,
        'success'
      );
      loadData();
    } catch (err) {
      showToast(`认领失败: ${err.message}`, 'error');
    }
  };

  // Create Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('客户企业名称为必填项', 'warning');
      return;
    }
    setSubmittingCreate(true);
    try {
      await crmApi.createCustomer(formData);
      showToast(`客户「${formData.name}」已成功建档并录入「我的客户」！`, 'success');
      setCreateModalOpen(false);
      setFormData({
        name: '',
        industry: '',
        tier: 'KA',
        branch: branchFilter === '全部分公司' ? '华东分公司' : branchFilter,
        contactName: '',
        contactPhone: '',
      });
      loadData();
    } catch (err) {
      showToast(`新建客户失败: ${err.message}`, 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'VIP':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200 dark:border-purple-800">
            VIP 重点客户
          </span>
        );
      case 'KA':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200 dark:border-amber-800">
            KA 战略大客
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800">
            SMB 成长客户
          </span>
        );
    }
  };

  const currentList = tab === 'private' ? privateList : publicList;
  const currentTotal = tab === 'private' ? privateTotal : publicTotal;
  const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));

  return (
    <div id="module-customers" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        {/* Left: Tab Switcher & Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl text-xs">
            <button
              onClick={() => {
                setTab('private');
                setSelectedIds([]);
              }}
              className={tab === 'private' ? ACTIVE_TAB : INACTIVE_TAB}
            >
              <span>我的客户 ({privateTotal})</span>
            </button>
            <button
              onClick={() => {
                setTab('public');
                setSelectedIds([]);
              }}
              className={tab === 'public' ? ACTIVE_TAB : INACTIVE_TAB}
            >
              <span>分公司公海池 ({publicTotal})</span>
            </button>
          </div>

          {/* Branch Filter */}
          <div className="min-w-[200px]">
            <Select
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
              size="md"
              variant="filter"
              options={BRANCH_OPTIONS}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Batch Actions when items are selected */}
          {selectedIds.length > 0 && isManager && (
            <div className="flex items-center gap-2 bg-brand-50 dark:bg-blue-950/60 border border-brand-500/20 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-brand-600 dark:text-blue-400">
                已选 {selectedIds.length} 项:
              </span>
              {tab === 'private' ? (
                <button
                  type="button"
                  onClick={() => openReclaimModal(null)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  批量回收至公海
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAssignModal(null)}
                  className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  批量分配给指定人员
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>新建客户企业</span>
          </button>
        </div>
      </div>

      {/* Search and Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Icon name="search" className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索客户名称、联系人、电话或原负责人..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
            />
          </div>
          <Select
            value={tierFilter}
            onChange={(val) => setTierFilter(val)}
            size="md"
            variant="filter"
            options={[
              { value: '', label: '全部客户等级' },
              { value: 'VIP', label: 'VIP 重点客户' },
              { value: 'KA', label: 'KA 战略大客' },
              { value: 'SMB', label: 'SMB 成长客户' },
            ]}
          />
        </div>

        <div className="text-xs text-zinc-400">
          当前视图匹配到: <strong className="text-zinc-800 dark:text-zinc-200">{currentList.length}</strong> 家企业
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            <Icon name="rotate-ccw" className="w-5 h-5 mx-auto mb-2 animate-spin text-brand-500" />
            正在加载客户数据...
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            <Icon name="building-2" className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            {tab === 'private'
              ? '当前暂无匹配的「我的客户」'
              : '当前分公司公海池暂无沉淀客户，所有客户均在高效跟进中'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-400 border-b border-zinc-200/80 dark:border-zinc-800 uppercase font-semibold">
                <tr>
                  {isManager && (
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === currentList.length && currentList.length > 0}
                        onChange={() => selectAll(currentList)}
                        className="rounded text-brand-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">企业客户名称</th>
                  <th className="py-3 px-4">所属分公司</th>
                  <th className="py-3 px-4">客户级别</th>
                  <th className="py-3 px-4">行业领域</th>
                  <th className="py-3 px-4">关键联系人</th>
                  {tab === 'private' ? (
                    <th className="py-3 px-4">当前归属销售</th>
                  ) : (
                    <>
                      <th className="py-3 px-4">前负责人</th>
                      <th className="py-3 px-4">公海回收原因</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-right">管理者调度 & 业务操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {currentList.map((item) => {
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors ${
                        isChecked ? 'bg-brand-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox for managers */}
                      {isManager && (
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(item.id)}
                            className="rounded text-brand-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Customer Name */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openCustomerDetail(item)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 text-sm hover:text-brand-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 text-left group"
                          title="点击查看360°企业客户工商详情与多维联系方式"
                        >
                          <span>{item.name}</span>
                          <Icon name="external-link" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-brand-500 transition-opacity" />
                        </button>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>ID: #{item.id}</span>
                          {item.socialCode && (
                            <span className="font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-[130px]" title={item.socialCode}>
                              {item.socialCode}
                            </span>
                          )}
                          <span>· {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '近期'}</span>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {item.branch || '华东分公司'}
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTierBadge(item.tier)}
                      </td>

                      {/* Industry */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {item.industry || '综合高新'}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {item.contactName || '未指定联系人'}
                          </span>
                          {(() => {
                            let count = 0;
                            if (item.contacts) {
                              try {
                                const list = typeof item.contacts === 'string' ? JSON.parse(item.contacts) : item.contacts;
                                count = Array.isArray(list) ? list.length : 0;
                              } catch (e) {}
                            }
                            return count > 1 ? (
                              <button
                                type="button"
                                onClick={() => openCustomerDetail(item)}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-brand-500 hover:text-white transition-all cursor-pointer"
                                title="点击查看所有多维联系方式"
                              >
                                {count} 方式
                              </button>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          {item.contactPhone || '未填写电话'}
                        </div>
                      </td>

                      {/* Owner / Public sea info */}
                      {tab === 'private' ? (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              {item.ownerName || '未分配'}
                            </span>
                          </div>
                          {item.assignedAt && (
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              指派于 {new Date(item.assignedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-zinc-500">
                            {item.prevOwnerName || '无记录'}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-zinc-500" title={item.reclaimReason}>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                              {item.reclaimReason || '管理者手动回收'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 360° Profile Button */}
                          <button
                            type="button"
                            onClick={() => openCustomerDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 transition-all text-[11px]"
                            title="查看360°企业工商全景与完整联系方式矩阵"
                          >
                            <Icon name="file-text" className="w-3.5 h-3.5" />
                            <span>详情</span>
                          </button>

                          {/* TAB 1 (Private Sea Actions): Reclaim & Assign */}
                          {tab === 'private' && (
                            <>
                              {/* Manager Action: 回收客户至分公司公海 */}
                              {isManager && (
                                <button
                                  type="button"
                                  onClick={() => openReclaimModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-2xs text-[11px]"
                                  title="分公司管理者特权：回收该客户到分公司公海池重新调度"
                                >
                                  <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
                                  <span>回收公海</span>
                                </button>
                              )}

                              {/* Manager Action: 分配给指定人员 */}
                              {isManager && (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 font-bold border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-all shadow-2xs text-[11px]"
                                  title="分公司管理者特权：重新指派该客户给团队指定成员"
                                >
                                  <Icon name="share-2" className="w-3.5 h-3.5" />
                                  <span>转派他人</span>
                                </button>
                              )}

                              {/* Follow-up drawer */}
                              <button
                                type="button"
                                onClick={() => onOpenFollowup && onOpenFollowup(item.name)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-[11px] hover:bg-zinc-200"
                              >
                                跟进记录
                              </button>
                            </>
                          )}

                          {/* TAB 2 (Public Sea Actions): Manager Assign & Sales Claim */}
                          {tab === 'public' && (
                            <>
                              {/* Manager Action: 直接从公海分配给指定人员 */}
                              {isManager && (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] shadow-sm transition-all"
                                  title="管理者特权：直接将此公海客户分配给指定业务人员"
                                >
                                  <Icon name="share-2" className="w-3.5 h-3.5" />
                                  <span>分配给指定人员</span>
                                </button>
                              )}

                              {/* Sales Rep Action: 认领为我的客户 */}
                              <button
                                type="button"
                                onClick={() => handleClaimCustomer(item)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[11px]"
                                title="认领此公海客户至「我的客户」进行深度跟进"
                              >
                                <Icon name="plus" className="w-3.5 h-3.5" />
                                <span>认领为我的客户</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {currentTotal > 0 && (
          <div className="px-6 py-4 bg-zinc-50/80 dark:bg-zinc-800/40 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <div>
              显示第 <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{(page - 1) * pageSize + 1}</strong> 至{' '}
              <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{Math.min(page * pageSize, currentTotal)}</strong> 条，
              共 <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{currentTotal}</strong> 家企业客户
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 font-semibold transition-colors"
              >
                上一页
              </button>

              <div className="flex items-center gap-1 px-2 font-mono">
                <span className="font-bold text-brand-600 dark:text-blue-400">{page}</span>
                <span>/</span>
                <span>{totalPages} 页</span>
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 font-semibold transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ================= Reclaim Customer Modal (回收至公海) ==================== */}
      {/* ========================================================================= */}
      {reclaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Icon name="rotate-ccw" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    分公司客户回收至公海池
                  </h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    分公司管理者权限 · 资源重整与客户流动保障
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReclaimModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target info card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs">
                {targetCustomerForReclaim ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">目标客户:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{targetCustomerForReclaim.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">所属分公司:</span>
                      <span className="font-bold text-brand-600">{targetCustomerForReclaim.branch || '华东分公司'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">当前归属销售:</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{targetCustomerForReclaim.ownerName}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-brand-600 font-bold">
                    批量回收模式：即将把已选中的 {selectedIds.length} 位客户同时释放回分公司公海池！
                  </div>
                )}
              </div>

              {/* Preset Reason Tags */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  快捷选择回收原因:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '超过15天未跟进系统回收',
                    '分公司管理者手动回收重新分配',
                    '销售人员工作调动交接',
                    '销售主动申请释放流转',
                    '客户需求变更重新统筹',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReclaimReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                        reclaimReason === preset
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason Text */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  回收原因说明 / 流转日志:
                </label>
                <textarea
                  rows={2}
                  required
                  value={reclaimReason}
                  onChange={(e) => setReclaimReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                回收后，客户将归入所对应分公司的公海池中，原负责人的私海保护期立即解除。管理者可随时从公海重新指派给其他指定人员。
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReclaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={submittingReclaim}
                  onClick={handleConfirmReclaim}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20 active:scale-95"
                >
                  {submittingReclaim ? '正在回收...' : '确认回收至分公司公海'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= Assign Customer Modal (分配给指定人员) ================= */}
      {/* ========================================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-brand-600 flex items-center justify-center">
                  <Icon name="share-2" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    分配客户给指定人员
                  </h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    分公司管理者特权 · 精准派单与商机孵化
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target info card */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs">
                {targetCustomerForAssign ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">指派客户:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{targetCustomerForAssign.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">来源池:</span>
                      <span className="font-bold text-brand-600">
                        {targetCustomerForAssign.isPublicSea ? '【分公司公海池】' : `当前负责人: ${targetCustomerForAssign.ownerName}`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-brand-600 font-bold">
                    批量指派模式：即将把已选中的 {selectedIds.length} 位客户统一分配给所选负责人！
                  </div>
                )}
              </div>

              {/* Target Sales Person Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  选择接收该客户的指定人员 * :
                </label>
                <Select
                  value={targetUserId}
                  onChange={(val) => setTargetUserId(val)}
                  fullWidth
                  size="md"
                  options={teamUsers.map((u) => ({
                    value: u.id,
                    label: `${u.realName} (@${u.username}) · ${u.branch || '华东分公司'} · ${u.role?.name}`,
                  }))}
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  该成员将立即获得该客户的私海保护权，并同步计入其销售管辖资产中。
                </p>
              </div>

              {/* Follow-up Note */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  跟进要求指示与任务批注:
                </label>
                <input
                  type="text"
                  placeholder="如: 该客户为Q4重点KA企业，请在3天内完成首轮线上技术接洽！"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={submittingAssign}
                  onClick={handleConfirmAssign}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20 active:scale-95"
                >
                  {submittingAssign ? '正在分配...' : '确认分配给该人员'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= Create Customer Modal =========================== */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                新建客户企业档案
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  企业全称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="如: 苏州汇川技术股份有限公司"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    所属分公司
                  </label>
                  <Select
                    value={formData.branch}
                    onChange={(val) => setFormData({ ...formData, branch: val })}
                    fullWidth
                    size="md"
                    options={[
                      { value: '华东分公司', label: '华东分公司' },
                      { value: '华南分公司', label: '华南分公司' },
                      { value: '华北分公司', label: '华北分公司' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    客户级别
                  </label>
                  <Select
                    value={formData.tier}
                    onChange={(val) => setFormData({ ...formData, tier: val })}
                    fullWidth
                    size="md"
                    options={[
                      { value: 'VIP', label: 'VIP 重点客户' },
                      { value: 'KA', label: 'KA 战略大客' },
                      { value: 'SMB', label: 'SMB 成长客户' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  行业领域
                </label>
                <input
                  type="text"
                  placeholder="如: 工业自动化 / 新能源装备"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    首要对接人
                  </label>
                  <input
                    type="text"
                    placeholder="如: 李总工"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    placeholder="13800000000"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20 active:scale-95"
                >
                  {submittingCreate ? '正在建档...' : '确认新建入库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 360° Customer Detail Drawer with Multi-contacts */}
      <CustomerDetailDrawer
        open={detailDrawerOpen}
        customer={selectedCustomerForDetail}
        onClose={() => setDetailDrawerOpen(false)}
        onCustomerUpdated={handleCustomerUpdated}
        isManager={isManager}
        onReclaim={openReclaimModal}
        onAssign={openAssignModal}
        onClaim={handleClaimCustomer}
        onOpenFollowup={onOpenFollowup}
      />
    </div>
  );
}
