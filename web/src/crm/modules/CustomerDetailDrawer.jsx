import { useState, useEffect, useMemo } from 'react';
import Icon from '../../shared/Icon';
import Select from '../components/Select';
import { crmApi } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

const CONTACT_ROLE_OPTIONS = [
  { value: '法定代表人 / 执行董事', label: '法定代表人 / 执行董事', badge: '核心人' },
  { value: '董事长 / 总裁 / 总经理', label: '董事长 / 总裁 / 总经理', badge: '决策人' },
  { value: '联合创始人 / 副总裁 / VP', label: '联合创始人 / 副总裁 / VP', badge: '高层' },
  { value: '商务总监 / 业务负责人', label: '商务总监 / 业务负责人', badge: '商务' },
  { value: '采购总监 / 采购负责人', label: '采购总监 / 采购负责人', badge: '采购' },
  { value: '财务总监 / 财务负责人', label: '财务总监 / 财务负责人', badge: '财务' },
  { value: '技术总监 / CTO / 研发负责人', label: '技术总监 / CTO / 研发负责人', badge: '技术' },
  { value: '运营总监 / 市场总监', label: '运营总监 / 市场总监', badge: '市场' },
  { value: '业务对接人 / 项目经理', label: '业务对接人 / 项目经理', badge: '跟进' },
  { value: '法务主管 / 合规风控', label: '法务主管 / 合规风控', badge: '法务' },
  { value: '前台总机 / 行政联络', label: '前台总机 / 行政联络', badge: '总机' },
  { value: '主要联系人', label: '主要联系人', badge: '默认' },
  { value: '其他关键决策人', label: '其他关键决策人', badge: '其他' },
];

const CONTACT_TYPE_OPTIONS = [
  { value: '手机移动端', label: '手机移动端 (个人直拨)', icon: 'phone', badge: '常用' },
  { value: '企业微信', label: '企业微信 / 业务微信', icon: 'message-square', badge: '即时' },
  { value: '企业固话', label: '企业固话 / 前台总机', icon: 'phone', badge: '总机' },
  { value: '电子邮箱', label: '电子邮箱 (商务/对公)', icon: 'mail', badge: '邮件' },
  { value: '财务专线', label: '财务专线 / 开票对账', icon: 'receipt', badge: '结算' },
  { value: '企业法人', label: '企业法人 / 执行董事专线', icon: 'user', badge: '法人' },
  { value: '企查查公开', label: '企查查公开年报联络', icon: 'building-2', badge: '公示' },
  { value: '主要联系人', label: '主要业务联络方式', icon: 'user', badge: '主要' },
  { value: '其他渠道', label: '其他联络方式', icon: 'compass', badge: '备用' },
];

const REGIST_STATUS_OPTIONS = [
  { value: '存续', label: '存续 (在营/开业/在册)' },
  { value: '在业', label: '在业 (正常营业中)' },
  { value: '注销', label: '已注销' },
  { value: '迁出', label: '已迁出' },
  { value: '吊销', label: '已吊销' },
];

const TIER_OPTIONS = [
  { value: 'VIP', label: 'VIP 重点客户', badge: 'VIP' },
  { value: 'KA', label: 'KA 战略大客', badge: 'KA' },
  { value: 'SMB', label: 'SMB 成长客户', badge: 'SMB' },
];

export default function CustomerDetailDrawer({
  open,
  customer,
  onClose,
  onCustomerUpdated,
  isManager,
  onReclaim,
  onAssign,
  onClaim,
  onOpenFollowup,
}) {
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'profile' | 'business'
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Contact management state
  const [contactList, setContactList] = useState([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    type: '手机移动端',
    isPrimary: false,
  });

  // Dynamically include current role if not in preset options
  const roleSelectOptions = useMemo(() => {
    if (contactForm.role && !CONTACT_ROLE_OPTIONS.some((o) => o.value === contactForm.role)) {
      return [{ value: contactForm.role, label: contactForm.role, badge: '当前' }, ...CONTACT_ROLE_OPTIONS];
    }
    return CONTACT_ROLE_OPTIONS;
  }, [contactForm.role]);

  // Dynamically include current type if not in preset options
  const typeSelectOptions = useMemo(() => {
    if (contactForm.type && !CONTACT_TYPE_OPTIONS.some((o) => o.value === contactForm.type)) {
      return [{ value: contactForm.type, label: contactForm.type, badge: '当前' }, ...CONTACT_TYPE_OPTIONS];
    }
    return CONTACT_TYPE_OPTIONS;
  }, [contactForm.type]);

  // Enterprise edit modal state
  const [isEditingEnterprise, setIsEditingEnterprise] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({});
  const [savingEnterprise, setSavingEnterprise] = useState(false);

  // Load detailed customer information
  useEffect(() => {
    if (open && customer?.id) {
      loadCustomerDetail(customer.id);
    } else {
      setDetailData(null);
      setContactList([]);
      setIsAddingContact(false);
      setEditingContactId(null);
      setIsEditingEnterprise(false);
    }
  }, [open, customer?.id]);

  const loadCustomerDetail = async (id) => {
    setLoading(true);
    try {
      const res = await crmApi.getCustomer(id);
      const data = res.data || customer;
      setDetailData(data);
      parseContacts(data);
    } catch (err) {
      console.warn('Failed to fetch full customer details, fallback to table summary', err);
      setDetailData(customer);
      parseContacts(customer);
    } finally {
      setLoading(false);
    }
  };

  const parseContacts = (cust) => {
    if (!cust) return;
    let list = [];
    if (cust.contacts) {
      try {
        const parsed = typeof cust.contacts === 'string' ? JSON.parse(cust.contacts) : cust.contacts;
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch (e) {
        console.error('Failed to parse contacts JSON', e);
      }
    }

    // Fallback if no contacts array present
    if (list.length === 0) {
      list = [
        {
          id: 'ct-1',
          name: cust.contactName || cust.legalPerson || '主要联系人',
          role: cust.legalPerson ? '法定代表人 / 执行董事' : '业务主联系人',
          phone: cust.contactPhone || '',
          email: cust.contactEmail || '',
          type: '主要联系人',
          isPrimary: true,
        },
      ];
    }
    setContactList(list);
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`已成功复制${label}：${text}`, 'success');
  };

  // Save contacts list to backend
  const saveContactsToBackend = async (newContacts) => {
    if (!detailData) return;
    const primary = newContacts.find((c) => c.isPrimary) || newContacts[0] || {};
    const updatedPayload = {
      ...detailData,
      contacts: JSON.stringify(newContacts),
      contactName: primary.name || detailData.contactName,
      contactPhone: primary.phone || detailData.contactPhone,
      contactEmail: primary.email || detailData.contactEmail,
    };

    try {
      await crmApi.updateCustomer(detailData.id, updatedPayload);
      setContactList(newContacts);
      setDetailData(updatedPayload);
      if (onCustomerUpdated) {
        onCustomerUpdated(updatedPayload);
      }
      showToast('联系人资料已实时同步保存', 'success');
      return true;
    } catch (err) {
      showToast(`保存联系人失败: ${err.message}`, 'error');
      return false;
    }
  };

  // Add new contact or save edit
  const handleSaveContact = async () => {
    if (!contactForm.phone.trim() && !contactForm.email.trim()) {
      showToast('请至少填写手机电话或电子邮箱中的一项', 'warning');
      return;
    }

    let updated = [...contactList];

    if (editingContactId) {
      // Edit existing
      updated = updated.map((c) => {
        if (c.id === editingContactId) {
          return {
            ...c,
            ...contactForm,
            name: contactForm.name.trim() || '业务联系人',
          };
        }
        return contactForm.isPrimary ? { ...c, isPrimary: false } : c;
      });
    } else {
      // Add new
      const newId = `ct-${Date.now()}`;
      const newContact = {
        id: newId,
        name: contactForm.name.trim() || `联系人-${contactList.length + 1}`,
        role: contactForm.role.trim() || '业务对接',
        phone: contactForm.phone.trim(),
        email: contactForm.email.trim(),
        type: contactForm.type || '业务手机',
        isPrimary: contactForm.isPrimary || contactList.length === 0,
      };

      if (newContact.isPrimary) {
        updated = updated.map((c) => ({ ...c, isPrimary: false }));
      }
      updated.push(newContact);
    }

    const success = await saveContactsToBackend(updated);
    if (success) {
      setIsAddingContact(false);
      setEditingContactId(null);
      setContactForm({
        name: '',
        role: '',
        phone: '',
        email: '',
        type: '手机移动端',
        isPrimary: false,
      });
    }
  };

  // Set contact as primary
  const handleSetPrimary = async (contactId) => {
    const updated = contactList.map((c) => ({
      ...c,
      isPrimary: c.id === contactId,
    }));
    await saveContactsToBackend(updated);
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    if (contactList.length <= 1) {
      showToast('至少需保留一个企业联系人方式', 'warning');
      return;
    }
    const target = contactList.find((c) => c.id === contactId);
    const updated = contactList.filter((c) => c.id !== contactId);
    if (target?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    await saveContactsToBackend(updated);
  };

  // Start editing a contact
  const handleStartEditContact = (c) => {
    setEditingContactId(c.id);
    setContactForm({
      name: c.name || '',
      role: c.role || '',
      phone: c.phone || '',
      email: c.email || '',
      type: c.type || '手机移动端',
      isPrimary: !!c.isPrimary,
    });
    setIsAddingContact(true);
  };

  // Save enterprise profile edits
  const handleSaveEnterprise = async () => {
    setSavingEnterprise(true);
    try {
      await crmApi.updateCustomer(detailData.id, enterpriseForm);
      setDetailData((prev) => ({ ...prev, ...enterpriseForm }));
      setIsEditingEnterprise(false);
      if (onCustomerUpdated) {
        onCustomerUpdated({ ...detailData, ...enterpriseForm });
      }
      showToast('企业工商信息已更新', 'success');
    } catch (err) {
      showToast(`保存失败: ${err.message}`, 'error');
    } finally {
      setSavingEnterprise(false);
    }
  };

  if (!open) return null;

  const current = detailData || customer || {};
  const isPublic = Boolean(current.isPublicSea || current.poolType === 'branch_public');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 shadow-2xl h-full flex flex-col z-10 border-l border-zinc-200 dark:border-zinc-800 animate-slide-left">
        {/* Drawer Header (Solid Dark Surface, NO Gradient) */}
        <div className="p-5 sm:p-6 bg-[#0f172a] text-white shrink-0 border-b border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                  <Icon name="building-2" className="w-4 h-4 text-slate-200" />
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60">
                  {current.branch || '华东分公司'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    current.tier === 'VIP'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                      : current.tier === 'KA'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                  }`}
                >
                  {current.tier || 'SMB'} 客户
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  {current.registStatus || '存续'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isPublic
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                  }`}
                >
                  {isPublic ? '分公司公海' : '我的客户'}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white break-words leading-snug">
                  {current.name || '客户企业档案'}
                </h2>
                {current.name && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(current.name, '企业全称')}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 mt-0.5 cursor-pointer"
                    title="复制企业全称"
                  >
                    <Icon name="copy" className="w-4 h-4" />
                  </button>
                )}
              </div>

              {current.englishName && (
                <div className="text-xs text-slate-400 font-mono tracking-wide">
                  {current.englishName}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <Icon name="user" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>负责人:</span>
                  <span className="font-medium text-white">
                    {current.ownerName || (isPublic ? '公海池待认领' : '未指定')}
                  </span>
                </span>
                {current.socialCode && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Icon name="file-text" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>统一代码:</span>
                    <span className="text-white">{current.socialCode}</span>
                  </span>
                )}
                {current.province && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="map-pin" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-white">
                      {current.province} {current.city && `· ${current.city}`}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick action buttons & Close */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
              {/* If in public sea, allow claiming */}
              {isPublic && onClaim && (
                <button
                  type="button"
                  onClick={() => {
                    onClaim(current);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>认领客户</span>
                </button>
              )}

              {/* Manager Reclaim Action */}
              {isManager && !isPublic && onReclaim && (
                <button
                  type="button"
                  onClick={() => {
                    onReclaim(current);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="管理者权限：将该客户回收至分公司公海"
                >
                  <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
                  <span>回收公海</span>
                </button>
              )}

              {/* Manager Assign Action */}
              {isManager && onAssign && (
                <button
                  type="button"
                  onClick={() => {
                    onAssign(current);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="管理者权限：指派分配给团队成员"
                >
                  <Icon name="user-plus" className="w-3.5 h-3.5" />
                  <span>指派团队</span>
                </button>
              )}

              {/* Followup button */}
              {onOpenFollowup && (
                <button
                  type="button"
                  onClick={() => onOpenFollowup(current.name)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="登记并查看销售跟进记录"
                >
                  <Icon name="message-square" className="w-3.5 h-3.5" />
                  <span>跟进记录</span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
                title="关闭抽屉"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'contacts'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
              }`}
            >
              <Icon name="users" className="w-4 h-4" />
              <span>多维联系方式矩阵</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'contacts' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}>
                {contactList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
              }`}
            >
              <Icon name="building-2" className="w-4 h-4" />
              <span>企业工商完整全貌</span>
            </button>

            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'business'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
              }`}
            >
              <Icon name="briefcase" className="w-4 h-4" />
              <span>经营范围与行业资质</span>
            </button>
          </div>

          {/* Quick Edit Enterprise Button */}
          <button
            type="button"
            onClick={() => {
              setEnterpriseForm({
                name: current.name || '',
                legalPerson: current.legalPerson || '',
                registCapital: current.registCapital || '',
                registStatus: current.registStatus || '存续',
                province: current.province || '',
                city: current.city || '',
                district: current.district || '',
                enterpriseAddress: current.enterpriseAddress || '',
                website: current.website || '',
                socialCode: current.socialCode || '',
                industry: current.industry || '',
                tier: current.tier || 'KA',
                branch: current.branch || '华东分公司',
              });
              setIsEditingEnterprise(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-blue-400 hover:bg-brand-50 dark:hover:bg-blue-950/60 rounded-xl transition-colors"
          >
            <Icon name="edit-3" className="w-3.5 h-3.5" />
            <span>编辑企业资料</span>
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-8 text-center text-xs text-zinc-400">
              <Icon name="rotate-ccw" className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-500" />
              正在同步企业画像与联系人全库数据...
            </div>
          )}

          {/* TAB 1: 多维联系方式矩阵 (Multiple Contacts) */}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>联系人与联络矩阵</span>
                    <span className="text-xs font-normal text-zinc-500">
                      （支持法人、总机、业务经理、采购部等多联系方式统一管理）
                    </span>
                  </h3>
                </div>

                {!isAddingContact && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContactId(null);
                      setContactForm({
                        name: '',
                        role: '',
                        phone: '',
                        email: '',
                        type: '手机移动端',
                        isPrimary: contactList.length === 0,
                      });
                      setIsAddingContact(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    <span>添加联系方式</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Contact Form Inline Card */}
              {isAddingContact && (
                <div className="bg-brand-50/50 dark:bg-blue-950/20 border border-brand-200 dark:border-blue-900/40 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-brand-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Icon name="user-plus" className="w-4 h-4" />
                      <span>{editingContactId ? '编辑联系方式' : '录入新联系方式'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingContact(false);
                        setEditingContactId(null);
                      }}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                        联系人姓名
                      </label>
                      <input
                        type="text"
                        placeholder="例如：张建华 / 前台总机"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                        角色 / 职务头衔
                      </label>
                      <Select
                        value={contactForm.role || '主要联系人'}
                        onChange={(val) => setContactForm({ ...contactForm, role: val })}
                        fullWidth
                        size="md"
                        placeholder="选择职务头衔..."
                        options={roleSelectOptions}
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                        联系渠道类型
                      </label>
                      <Select
                        value={contactForm.type || '手机移动端'}
                        onChange={(val) => setContactForm({ ...contactForm, type: val })}
                        fullWidth
                        size="md"
                        placeholder="选择渠道类型..."
                        options={typeSelectOptions}
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                        电话 / 手机号码
                      </label>
                      <input
                        type="text"
                        placeholder="例如：13800138000 或 021-88889999"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                        电子邮箱
                      </label>
                      <input
                        type="email"
                        placeholder="例如：contact@company.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactForm.isPrimary}
                          onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                          className="rounded text-brand-500 cursor-pointer"
                        />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          设为企业主要联络方式
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingContact(false);
                        setEditingContactId(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      {editingContactId ? '保存修改' : '确认录入'}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contactList.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      c.isPrimary
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-brand-300 dark:border-blue-800/80 shadow-xs'
                        : 'bg-white dark:bg-zinc-800/50 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            c.isPrimary
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {c.name ? c.name.charAt(0) : '联'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                              {c.name || '联系人'}
                            </span>
                            {c.isPrimary && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-brand-500 text-white shadow-2xs">
                                ★ 主联系人
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {c.role || '主要对接人'}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                        {c.type || '业务电话'}
                      </span>
                    </div>

                    {/* Phone & Email Rows */}
                    <div className="space-y-2 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      {c.phone && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-mono">
                            <Icon name="phone" className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{c.phone}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.phone, '电话')}
                              className="p-1 text-zinc-400 hover:text-brand-600 dark:hover:text-blue-400 transition-colors"
                              title="复制号码"
                            >
                              <Icon name="copy" className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`tel:${c.phone}`}
                              className="p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
                              title="点击外呼"
                            >
                              <Icon name="phone" className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {c.email && (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-mono truncate max-w-[200px] sm:max-w-[240px]">
                            <Icon name="mail" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.email, '邮箱')}
                              className="p-1 text-zinc-400 hover:text-brand-600 dark:hover:text-blue-400 transition-colors"
                              title="复制邮箱"
                            >
                              <Icon name="copy" className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`mailto:${c.email}`}
                              className="p-1 text-zinc-400 hover:text-brand-600 transition-colors"
                              title="发送邮件"
                            >
                              <Icon name="send" className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {!c.phone && !c.email && (
                        <div className="text-zinc-400 italic text-[11px]">暂无联络方式</div>
                      )}
                    </div>

                    {/* Bottom Action Footer for Card */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                      {!c.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(c.id)}
                          className="text-brand-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          设为主要联系人
                        </button>
                      ) : (
                        <span className="text-zinc-400 font-medium">默认第一联络通道</span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditContact(c)}
                          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          编辑
                        </button>
                        {contactList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(c.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 企业工商完整全貌 (QCC Enterprise Profile) */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Section 1: 核心资质与法定编码 */}
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                  <Icon name="shield-check" className="w-4 h-4 text-brand-600 dark:text-blue-400" />
                  <span>核心资质与企业社会统一编码</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">统一社会信用代码</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between">
                      <span>{current.socialCode || '暂无'}</span>
                      {current.socialCode && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(current.socialCode, '统一社会信用代码')}
                          className="text-zinc-400 hover:text-brand-600"
                          title="复制"
                        >
                          <Icon name="copy" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">纳税人识别号</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between">
                      <span>{current.taxpayerCode || current.socialCode || '同统一信用代码'}</span>
                      {current.taxpayerCode && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(current.taxpayerCode, '纳税人识别号')}
                          className="text-zinc-400 hover:text-brand-600"
                          title="复制"
                        >
                          <Icon name="copy" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">工商注册号</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.registCode || '暂无注册号'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">组织机构代码</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.orgCode || '暂无代码'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 注册资本与法定代表 */}
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                  <Icon name="landmark" className="w-4 h-4 text-emerald-600" />
                  <span>资本运作与法定代表概况</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">法定代表人</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.legalPerson || current.contactName || '未披露'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">注册资本</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {current.registCapital || '未披露'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">登记状态</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                        {current.registStatus || '存续'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">成立日期</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.establishDate || '早于2020'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">核准日期</div>
                    <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.approvalDate || '近期核准'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">参保人数</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {current.insuredTotal ? `${current.insuredTotal} 人` : '暂未统计'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: 组织性质与行政区划 */}
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                  <Icon name="layers" className="w-4 h-4 text-purple-600" />
                  <span>组织形态与归属区域</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">企业组织类型</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.enterpriseType || '有限责任公司'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">所属行政区划</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {current.province || '中国'} {current.city ? `/ ${current.city}` : ''} {current.district ? `/ ${current.district}` : ''}
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <div className="text-[11px] text-zinc-400 mb-1">官方网站</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs truncate">
                      {current.website ? (
                        <a
                          href={current.website.startsWith('http') ? current.website : `http://${current.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{current.website}</span>
                          <Icon name="external-link" className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        '未收录官网'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: 地址信息 */}
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                  <Icon name="map-pin" className="w-4 h-4 text-red-500" />
                  <span>注册住所与年报地址</span>
                </h3>
                <div className="space-y-3">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-zinc-400 mb-1">企业注册登记地址</div>
                      <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {current.enterpriseAddress || '未公开具体门牌地址'}
                      </div>
                    </div>
                    {current.enterpriseAddress && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(current.enterpriseAddress, '注册地址')}
                        className="text-zinc-400 hover:text-brand-600 shrink-0 p-1"
                        title="复制地址"
                      >
                        <Icon name="copy" className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {current.reportSite && (
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-zinc-400 mb-1">最新年报公示通讯地址</div>
                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {current.reportSite}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(current.reportSite, '年报地址')}
                        className="text-zinc-400 hover:text-brand-600 shrink-0 p-1"
                        title="复制地址"
                      >
                        <Icon name="copy" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: 曾用名 */}
              {current.oldName && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  <div className="text-[11px] text-zinc-400 mb-1">企业曾用名变更历史</div>
                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {current.oldName}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 经营范围与资质 (Business Scope) */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 rounded-lg bg-brand-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400">
                  <Icon name="briefcase" className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  企业核准经营范围 (Business Scope)
                </h3>
              </div>

              {/* Industry Tag Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-brand-50 dark:bg-blue-950 text-brand-600 dark:text-blue-400 border border-brand-200 dark:border-blue-900">
                  行业领域: {current.industry || '建筑工程技术'}
                </span>
                {current.sysTag && (
                  <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                    业务标签: {current.sysTag}
                  </span>
                )}
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                  客户分级: {current.tier || 'SMB'}
                </span>
              </div>

              {/* Full Business Text */}
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>工商公示经营范围文本</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(current.business, '经营范围')}
                    className="flex items-center gap-1 text-brand-600 dark:text-blue-400 hover:underline"
                  >
                    <Icon name="copy" className="w-3.5 h-3.5" />
                    <span>复制全文</span>
                  </button>
                </div>
                <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed tracking-wide font-normal whitespace-pre-wrap selection:bg-brand-100">
                  {current.business || '暂无详细经营范围文本公示'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            客户编号: #{current.id} · 创建于 {current.createdAt ? new Date(current.createdAt).toLocaleDateString() : '近期'}
          </div>

          <div className="flex items-center gap-2">
            {/* Manager: Reclaim / Assign */}
            {isManager && !current.isPublicSea && onReclaim && (
              <button
                type="button"
                onClick={() => {
                  onReclaim(current);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
              >
                <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
                回收至公海
              </button>
            )}

            {isManager && onAssign && (
              <button
                type="button"
                onClick={() => {
                  onAssign(current);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl border border-brand-500/30 bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-blue-400 font-bold text-xs hover:bg-brand-600 hover:text-white transition-all flex items-center gap-1"
              >
                <Icon name="share-2" className="w-3.5 h-3.5" />
                指派负责人
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* Edit Enterprise Info Modal */}
      {isEditingEnterprise && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Icon name="edit-3" className="w-5 h-5 text-brand-600" />
                <span>编辑企业工商档案</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingEnterprise(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  企业客户全称
                </label>
                <input
                  type="text"
                  value={enterpriseForm.name || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  法定代表人
                </label>
                <input
                  type="text"
                  value={enterpriseForm.legalPerson || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, legalPerson: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  注册资本
                </label>
                <input
                  type="text"
                  placeholder="例如：5000万元人民币"
                  value={enterpriseForm.registCapital || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, registCapital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  统一社会信用代码
                </label>
                <input
                  type="text"
                  value={enterpriseForm.socialCode || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, socialCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  登记状态
                </label>
                <Select
                  value={enterpriseForm.registStatus || '存续'}
                  onChange={(val) => setEnterpriseForm({ ...enterpriseForm, registStatus: val })}
                  fullWidth
                  size="md"
                  options={REGIST_STATUS_OPTIONS}
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  行业领域
                </label>
                <input
                  type="text"
                  value={enterpriseForm.industry || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, industry: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  客户评级
                </label>
                <Select
                  value={enterpriseForm.tier || 'KA'}
                  onChange={(val) => setEnterpriseForm({ ...enterpriseForm, tier: val })}
                  fullWidth
                  size="md"
                  options={TIER_OPTIONS}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  官方网址
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={enterpriseForm.website || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">
                  注册住所详细地址
                </label>
                <input
                  type="text"
                  value={enterpriseForm.enterpriseAddress || ''}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, enterpriseAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditingEnterprise(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-semibold hover:bg-zinc-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEnterprise}
                disabled={savingEnterprise}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                {savingEnterprise ? '保存中...' : '确认更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
