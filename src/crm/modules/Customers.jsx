import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import { crmApi, useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

const ACTIVE_TAB =
  'px-3.5 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-xs transition-all';
const INACTIVE_TAB =
  'px-3.5 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all';

export default function Customers({ active, onOpenFollowup }) {
  const showToast = useToast();
  const auth = useAuth();
  const [tab, setTab] = useState('private');
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Create Customer Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    tier: 'KA',
    contactName: '',
    contactPhone: '',
  });

  // Public sea pool items
  const [publicSeaList, setPublicSeaList] = useState([
    {
      id: 901,
      name: '苏宁易购集团零售云',
      industry: '新零售 / 南京',
      prevOwner: '赵峰 (已离职)',
      reason: '人员离职流转公海',
      days: '3 天',
      contactName: '周经理',
      contactPhone: '13912345671',
    },
    {
      id: 902,
      name: '无锡先导智能装备',
      industry: '锂电设备 / 无锡',
      prevOwner: '林晓峰',
      reason: '超过15天未跟进系统回收',
      days: '1 天',
      contactName: '钱工',
      contactPhone: '13912345672',
    },
    {
      id: 903,
      name: '上海联影医疗科技',
      industry: '高端医疗器械 / 上海',
      prevOwner: '苏雅洁',
      reason: '销售主动释放',
      days: '5 天',
      contactName: '吴总监',
      contactPhone: '13912345673',
    },
  ]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getCustomers({
        page: 1,
        pageSize: 50,
        keyword: keyword.trim(),
        tier: tierFilter,
      });
      if (res.data) {
        setCustomers(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      showToast(`获取客户列表失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadCustomers();
    }
  }, [active, keyword, tierFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('客户企业名称为必填项', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createCustomer(formData);
      showToast(`客户「${formData.name}」已成功建档并录入您的私海！`, 'success');
      setCreateModalOpen(false);
      setFormData({
        name: '',
        industry: '',
        tier: 'KA',
        contactName: '',
        contactPhone: '',
      });
      loadCustomers();
    } catch (err) {
      showToast(`新建客户失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const releaseToOpenSea = async (customer) => {
    if (confirm(`确定将客户「${customer.name}」退回公共公海池吗？退回后其他人可自主捡入。`)) {
      try {
        await crmApi.deleteCustomer(customer.id);
        showToast(`客户「${customer.name}」已释放至公海池！`, 'info');
        // Add to public sea list
        setPublicSeaList((prev) => [
          {
            id: customer.id,
            name: customer.name,
            industry: customer.industry || '综合科技',
            prevOwner: customer.ownerName || auth.user?.realName || '本账号',
            reason: '销售主动释放',
            days: '刚退回',
            contactName: customer.contactName || '负责人',
            contactPhone: customer.contactPhone || '13800000000',
          },
          ...prev,
        ]);
        loadCustomers();
      } catch (err) {
        showToast(`操作失败: ${err.message}`, 'error');
      }
    }
  };

  const claimCustomer = async (item) => {
    try {
      await crmApi.createCustomer({
        name: item.name,
        industry: item.industry.split(' / ')[0] || item.industry,
        tier: 'KA',
        contactName: item.contactName || '联系人',
        contactPhone: item.contactPhone || '13800000000',
      });
      showToast(`已成功将「${item.name}」从公海池捡入您的私海！请在15天内完成首访。`, 'success');
      setPublicSeaList((prev) => prev.filter((p) => p.name !== item.name));
      loadCustomers();
      setTimeout(() => setTab('private'), 400);
    } catch (err) {
      showToast(`捡入失败: ${err.message}`, 'error');
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

  return (
    <div id="module-customers" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              客户资产与公海池 (Accounts & Open Sea)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-xs font-semibold">
              15天超时自动流转公海
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            企业私海专属大客户保护与公共客户资源高效捡入流转机制 · 实时多租户权限隔离
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>新建客户</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
            <button
              id="cust-tab-private"
              onClick={() => setTab('private')}
              className={tab === 'private' ? ACTIVE_TAB : INACTIVE_TAB}
            >
              我的私海 ({total} 家)
            </button>
            <button
              id="cust-tab-public"
              onClick={() => setTab('public')}
              className={tab === 'public' ? ACTIVE_TAB : INACTIVE_TAB}
            >
              公共客户公海池 ({publicSeaList.length} 家)
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Private Tab only) */}
      {tab === 'private' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121316] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Icon name="search" className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索客户名称、联系人、电话..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none focus:border-brand-500"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none"
            >
              <option value="">全部客群层级</option>
              <option value="VIP">VIP 重点客户</option>
              <option value="KA">KA 战略大客</option>
              <option value="SMB">SMB 中小客群</option>
            </select>
          </div>
          <div className="text-xs text-zinc-400">
            当前私海承载: <span className="font-bold text-brand-600">{customers.length}</span> / 50 家
          </div>
        </div>
      )}

      {/* Private Customers Section */}
      <div id="cust-section-private" className={tab === 'private' ? 'space-y-4' : 'space-y-4 hidden'}>
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">正在调取私海客户数据...</div>
        ) : customers.length === 0 ? (
          <div className="py-12 bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">暂无私海客户记录</p>
            <p className="text-xs text-zinc-400">点击右上角「新建客户」或前往「公共客户公海池」捡入</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-[#121316] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      {getTierBadge(c.tier)}
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-2 line-clamp-1">
                        {c.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {c.industry || '企业客户'} · 联系人: {c.contactName || '未指定'} ({c.contactPhone || '-'})
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {c.name.slice(0, 2)}
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs flex justify-between text-zinc-500">
                    <span>负责人: <strong className="text-zinc-700 dark:text-zinc-300">{c.ownerName || '我'}</strong></span>
                    <span className="text-emerald-600 font-medium">离公海还剩 14 天</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onOpenFollowup(c.name)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-brand-500 hover:text-white text-xs font-medium transition-colors"
                  >
                    写跟进
                  </button>
                  <button
                    onClick={() => releaseToOpenSea(c)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:text-rose-500 hover:border-rose-300 transition-colors"
                  >
                    退回公海
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public Open Sea Section */}
      <div id="cust-section-public" className={tab === 'public' ? 'space-y-4' : 'hidden space-y-4'}>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <span>
            ⚠️ 公海客户池说明：任何人均可自主捡入，每位销售人员最多同时保留 50 家私海客户。捡入后 15 天内无拜访记录将自动重新流回公海。
          </span>
          <span className="font-bold">当前公海存量: {publicSeaList.length} 家</span>
        </div>
        <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="py-3 px-4">公海企业名称</th>
                <th className="py-3 px-4">所属行业 / 城市</th>
                <th className="py-3 px-4">原前任负责人</th>
                <th className="py-3 px-4">流回公海原因</th>
                <th className="py-3 px-4">在公海停留时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {publicSeaList.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{item.name}</td>
                  <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{item.industry}</td>
                  <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{item.prevOwner}</td>
                  <td className="py-3.5 px-4 text-rose-500 font-medium">{item.reason}</td>
                  <td className="py-3.5 px-4 font-mono">{item.days}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => claimCustomer(item)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      捡入我的私海
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Customer Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">新建客户档案</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  客户企业全称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：杭州海康威视数字技术股份有限公司"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    所属行业
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="智能制造 / 汽车新能源"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    客群评级 (Tier)
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="VIP">VIP 重点客户</option>
                    <option value="KA">KA 战略大客户</option>
                    <option value="SMB">SMB 中小微客户</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    首要对接人
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="张经理"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="13800138000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '确认建档'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
