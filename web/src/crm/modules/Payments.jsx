import { useState, useEffect, useMemo } from 'react';
import Icon from '../../shared/Icon';
import Select from '../../shared/Select';
import { crmApi, useAuth } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

// Equal Value Entitlement Packages Catalog (等价权益置换标准产品库)
const EQUIVALENT_PACKAGES_CATALOG = [
  // ¥50,000 Tier
  {
    name: '企业云端私有化部署实施包',
    category: '系统实施交付类',
    value: 50000,
    features: ['1套高可用集群私有云部署', '全量业务数据无缝热迁移', '数据库调优与容器化部署支持'],
    description: '适用于需要企业内部物理服务器或专有云隔离环境的客户，提供标准交付与性能调优。',
    tag: '基础交付',
  },
  {
    name: 'AI 决策大模型专属算力包',
    category: 'AI算力智算类',
    value: 50000,
    features: ['1,000万 Token 深度智算推理额度', '智能销售助手专属微调', '行业Prompt专项调优方案'],
    description: '赋能企业一线销售与管理层，通过私有微调大模型实现商机意向精准挖掘与智能成单建议。',
    tag: 'AI 赋能',
  },
  {
    name: '资深数字化架构师 1v1 驻场专家包',
    category: '架构咨询类',
    value: 50000,
    features: ['15人天高级方案架构师驻场咨询', '业务流程全面诊断梳理', '全渠道系统对接落地指导'],
    description: '由拥有 10+ 年经验的技术与业务双重背景架构师贴身驻场，攻坚业务数字化痛点。',
    tag: '专家驻场',
  },
  {
    name: '7×24h 顶级 SLA 极速响应护航包',
    category: '专属SLA保障类',
    value: 50000,
    features: ['15分钟故障极速响应', '专职驻场工程师应急保障', '首席技术官绿色通道及双倍赔付'],
    description: '为核心业务高可用运行提供保驾护航，故障秒级排障，关键大促节点专人值守。',
    tag: '极速 SLA',
  },

  // ¥100,000 Tier
  {
    name: '千万级全渠道全业务中台部署实施包',
    category: '系统实施交付类',
    value: 100000,
    features: ['高并发分布式微服务集群部署', '跨系统消息队列高可用拓扑', '金融级多活灾备中台搭建'],
    description: '支撑百亿级吞吐的大型集团核心业务系统架构，具备超高并发承载能力。',
    tag: '集团中台',
  },
  {
    name: '企业级多模态大模型私有微调与算力集群年包',
    category: 'AI算力智算类',
    value: 100000,
    features: ['3,000万 Token 多模态智算算力', '本地化私有大模型量化微调', '私有向量知识库企业级部署'],
    description: '包含完整多模态生成式 AI 闭环体系，全面保护企业私域数据资产。',
    tag: '高阶智算',
  },
  {
    name: '年度首席数字化咨询顾问驻场与专属架构团队保障',
    category: '架构咨询类',
    value: 100000,
    features: ['40人天首席顾问驻场深度支持', '定制化数字化转型战略蓝图编制', 'IT架构综合评测与治理落地'],
    description: '全年度顾问式保驾护航，主导企业数字化变革蓝图顶层规划与各业务线协同。',
    tag: '首席专家',
  },
  {
    name: '全球异地双活灾备与 99.999% 极致高可用 SLA 保障包',
    category: '专属SLA保障类',
    value: 100000,
    features: ['秒级故障自动跨地域倒换', '双活容灾定期实战演练保障', '专属 SRE 专家组 365天全天候驻守'],
    description: '行业最高等级容灾 SLA，确保任何灾难场景下业务连续性达到 99.999% 五个九。',
    tag: '双活容灾',
  },
];

export default function Payments({ active }) {
  const showToast = useToast();
  const auth = useAuth();

  // Active top-level sub-view tab: 'statements' (银行流水) | 'settlements' (回款结算单) | 'entitlements' (客户权益中心)
  const [activeTab, setActiveTab] = useState('statements');

  // Data states
  const [bankStatements, setBankStatements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 1. Bank Association Modal State (关联系统订单结算)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [targetContractId, setTargetContractId] = useState('');
  const [associateType, setAssociateType] = useState('full'); // 'full' (全额关联) | 'partial' (部分关联)
  const [customAmount, setCustomAmount] = useState('');
  const [paymentType, setPaymentType] = useState('prepayment');
  const [associateNote, setAssociateNote] = useState('');
  const [associating, setAssociating] = useState(false);

  // 2. Switch Equivalent Entitlement Modal State (切换等价权益)
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [selectedEntitlement, setSelectedEntitlement] = useState(null);
  const [targetPackageName, setTargetPackageName] = useState('');
  const [switchReason, setSwitchReason] = useState('客户业务方向调整为优先使用 AI 算力赋能销售团队');
  const [switching, setSwitching] = useState(false);

  // 3. Switch History Modal State (权益变更审计履历)
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEntitlement, setHistoryEntitlement] = useState(null);

  // 4. Electronic Bank Receipt Modal State (银行回单预览)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptStatement, setReceiptStatement] = useState(null);

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [stmtRes, payRes, entRes, contRes] = await Promise.all([
        crmApi.getBankStatements({ keyword: keyword.trim(), status: statusFilter }).catch(() => ({ data: { list: [] } })),
        crmApi.getPayments({ page: 1, pageSize: 50, keyword: keyword.trim() }).catch(() => ({ data: { list: [] } })),
        crmApi.getCustomerEntitlements({ keyword: keyword.trim() }).catch(() => ({ data: { list: [] } })),
        crmApi.getContracts({ pageSize: 50 }).catch(() => ({ data: { list: [] } })),
      ]);

      if (stmtRes?.data?.list) setBankStatements(stmtRes.data.list);
      if (payRes?.data?.list) setPayments(payRes.data.list);
      if (entRes?.data?.list) setEntitlements(entRes.data.list);
      if (contRes?.data?.list) setContracts(contRes.data.list);
    } catch (err) {
      console.error(err);
      showToast(`调取回款结算数据失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadAllData();
    }
  }, [active, keyword, statusFilter]);

  // Financial Metrics
  const metrics = useMemo(() => {
    const totalBankInflow = bankStatements.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const totalLinkedAmount = bankStatements.reduce((sum, b) => sum + Number(b.linkedAmount || 0), 0);
    const totalUnlinkedRemain = bankStatements.reduce((sum, b) => sum + Number(b.remainAmount || 0), 0);
    const unlinkedCount = bankStatements.filter((b) => b.status === 'unlinked').length;
    const partialCount = bankStatements.filter((b) => b.status === 'partial').length;
    const settledCount = bankStatements.filter((b) => b.status === 'settled').length;

    const auditedPaymentsTotal = payments
      .filter((p) => p.status === 'audited')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const activeEntitlementsCount = entitlements.filter((e) => e.status === 'active').length;
    const inactiveEntitlementsCount = entitlements.filter((e) => e.status === 'inactive').length;
    const totalEntitlementsValue = entitlements
      .filter((e) => e.status === 'active')
      .reduce((sum, e) => sum + Number(e.value || 0), 0);

    return {
      totalBankInflow,
      totalLinkedAmount,
      totalUnlinkedRemain,
      unlinkedCount,
      partialCount,
      settledCount,
      auditedPaymentsTotal,
      activeEntitlementsCount,
      inactiveEntitlementsCount,
      totalEntitlementsValue,
    };
  }, [bankStatements, payments, entitlements]);

  // Open Link Modal
  const handleOpenLinkModal = (stmt) => {
    setSelectedStatement(stmt);
    // Find contracts matching counterparty
    const matched = contracts.find((c) => c.customerName === stmt.counterparty);
    const initialContract = matched || contracts[0];
    const initialId = initialContract ? String(initialContract.id) : '';
    setTargetContractId(initialId);

    // Default to full association
    setAssociateType('full');
    setCustomAmount(String(stmt.remainAmount));
    setPaymentType('prepayment');
    setAssociateNote(`关联流水【${stmt.statementNo}】至系统订单【${initialContract?.contractNo || ''}】`);
    setLinkModalOpen(true);
  };

  // Target Contract for modal
  const currentTargetContract = useMemo(() => {
    return contracts.find((c) => String(c.id) === String(targetContractId));
  }, [contracts, targetContractId]);

  // Options formatted for Select component (关联合同下拉选项)
  const contractOptions = useMemo(() => {
    return contracts.map((c) => ({
      value: String(c.id),
      label: `${c.contractNo} · ${c.customerName}`,
      description: `${c.title} (合同总标的: ¥${Number(c.amount).toLocaleString()})`,
      icon: 'file-check',
      badge:
        c.status === 'approved'
          ? '已核准'
          : c.status === 'active'
          ? '履约中'
          : c.status === 'completed'
          ? '已履约'
          : '待审批',
    }));
  }, [contracts]);

  // Options formatted for Payment Type Select (款项性质下拉选项)
  const paymentTypeOptions = useMemo(
    () => [
      {
        value: 'prepayment',
        label: '首付款 (预付款)',
        description: '合同首期款项或意向定金',
        icon: 'wallet',
      },
      {
        value: 'milestone',
        label: '阶段进度款',
        description: '项目按交付里程碑阶段回款',
        icon: 'layers',
      },
      {
        value: 'final',
        label: '尾款结清款',
        description: '项目最终验收结清款项',
        icon: 'check-circle-2',
      },
    ],
    []
  );

  // Calculate association amount
  const calculatedAssociateAmount = useMemo(() => {
    if (!selectedStatement) return 0;
    if (associateType === 'full') {
      return Number(selectedStatement.remainAmount || 0);
    }
    const val = parseFloat(customAmount);
    return isNaN(val) ? 0 : val;
  }, [associateType, selectedStatement, customAmount]);

  // Submit Bank Statement Association
  const handleSubmitAssociation = async (e) => {
    e.preventDefault();
    if (!selectedStatement || !targetContractId) {
      showToast('请选择目标关联合同/系统订单', 'warning');
      return;
    }

    const amount = calculatedAssociateAmount;
    if (amount <= 0) {
      showToast('关联核销金额必须大于 0', 'warning');
      return;
    }
    if (amount > selectedStatement.remainAmount + 0.01) {
      showToast(`关联金额不可超出银行流水剩余待核销金额 (¥${selectedStatement.remainAmount})`, 'warning');
      return;
    }

    setAssociating(true);
    try {
      const res = await crmApi.associateBankStatement({
        statementId: selectedStatement.id,
        contractId: Number(targetContractId),
        associateAmount: amount,
        associateType,
        paymentType,
        note: associateNote,
      });

      showToast(
        `🎉 银行流水【${selectedStatement.statementNo}】成功完成【${associateType === 'full' ? '全额关联' : '部分关联'}】结算！回款已正式入账，客户【${currentTargetContract?.customerName}】对应等价权益已自动生效！`,
        'success'
      );
      setLinkModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast(`关联回款结算失败: ${err.message}`, 'error');
    } finally {
      setAssociating(false);
    }
  };

  // Open Switch Modal
  const handleOpenSwitchModal = (ent) => {
    if (ent.status !== 'active') {
      showToast('该权益尚未完成银行流水关联回款，需完成流水结算后方可生效与切换！', 'warning');
      return;
    }
    setSelectedEntitlement(ent);
    // Find alternatives with equal value
    const alternatives = EQUIVALENT_PACKAGES_CATALOG.filter(
      (pkg) => pkg.value === ent.value && pkg.name !== ent.name
    );
    setTargetPackageName(alternatives[0]?.name || '');
    setSwitchReason(`客户业务方向调整为优先享受【${alternatives[0]?.name || '新权益'}】`);
    setSwitchModalOpen(true);
  };

  // Submit Switch Equivalent Entitlement
  const handleSubmitSwitch = async (e) => {
    e.preventDefault();
    if (!selectedEntitlement || !targetPackageName) {
      showToast('请选择目标等价权益包', 'warning');
      return;
    }

    const targetPkg = EQUIVALENT_PACKAGES_CATALOG.find((p) => p.name === targetPackageName);
    if (!targetPkg) {
      showToast('目标权益不存在', 'error');
      return;
    }

    setSwitching(true);
    try {
      await crmApi.switchCustomerEntitlement(selectedEntitlement.id, {
        newName: targetPkg.name,
        newCategory: targetPkg.category,
        reason: switchReason.trim() || '客户根据业务需求申请等价置换',
      });

      showToast(
        `✨ 客户【${selectedEntitlement.customerName}】权益已成功置换为【${targetPkg.name}】！公允价值 ¥${targetPkg.value.toLocaleString()} 等额平移生效，已写入审计履历。`,
        'success'
      );
      setSwitchModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast(`切换等价权益失败: ${err.message}`, 'error');
    } finally {
      setSwitching(false);
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = (ent) => {
    setHistoryEntitlement(ent);
    setHistoryModalOpen(true);
  };

  // Open Receipt Modal
  const handleOpenReceiptModal = (stmt) => {
    setReceiptStatement(stmt);
    setReceiptModalOpen(true);
  };

  // Parse history items safely
  const parsedHistory = useMemo(() => {
    if (!historyEntitlement?.switchHistory) return [];
    try {
      if (typeof historyEntitlement.switchHistory === 'string') {
        return JSON.parse(historyEntitlement.switchHistory);
      }
      return historyEntitlement.switchHistory;
    } catch {
      return [];
    }
  }, [historyEntitlement]);

  // Parse features safely
  const parseFeatures = (features) => {
    if (!features) return [];
    try {
      if (typeof features === 'string') return JSON.parse(features);
      return features;
    } catch {
      return [String(features)];
    }
  };

  // Filtered lists
  const filteredStatements = useMemo(() => {
    return bankStatements.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (!keyword.trim()) return true;
      const q = keyword.toLowerCase();
      return (
        b.statementNo?.toLowerCase().includes(q) ||
        b.counterparty?.toLowerCase().includes(q) ||
        b.bankName?.toLowerCase().includes(q) ||
        b.summary?.toLowerCase().includes(q)
      );
    });
  }, [bankStatements, statusFilter, keyword]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!keyword.trim()) return true;
      const q = keyword.toLowerCase();
      return (
        p.paymentNo?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.contractNo?.toLowerCase().includes(q)
      );
    });
  }, [payments, statusFilter, keyword]);

  const filteredEntitlements = useMemo(() => {
    return entitlements.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (!keyword.trim()) return true;
      const q = keyword.toLowerCase();
      return (
        e.entitlementNo?.toLowerCase().includes(q) ||
        e.customerName?.toLowerCase().includes(q) ||
        e.contractNo?.toLowerCase().includes(q) ||
        e.name?.toLowerCase().includes(q)
      );
    });
  }, [entitlements, statusFilter, keyword]);

  return (
    <div id="module-payments" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Icon name="credit-card" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>财务回款结算与客户等价权益中心</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  银行电汇对账 · 订单回款闭环
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                银行流水关联系统订单完成回款结算（支持全额/部分关联），回款核销后客户权益即刻生效并支持等价置换
              </p>
            </div>
          </div>
        </div>

        {/* Top-level Tabs Switching */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('statements');
              setStatusFilter('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'statements'
                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon name="landmark" className="w-4 h-4" />
            <span>银行流水台账</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
              {bankStatements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('settlements');
              setStatusFilter('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settlements'
                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon name="file-check" className="w-4 h-4" />
            <span>回款结算单据</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              {payments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('entitlements');
              setStatusFilter('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'entitlements'
                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon name="gift" className="w-4 h-4" />
            <span>客户权益中心</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
              {entitlements.length}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">银行入账总额 (总流水)</span>
            <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Icon name="wallet" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold mt-2 text-zinc-900 dark:text-zinc-100">
            ¥{metrics.totalBankInflow.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
            <span>已核销回款: ¥{(metrics.totalLinkedAmount / 10000).toFixed(1)}万</span>
            <span className="text-emerald-500 font-medium font-mono">
              {((metrics.totalLinkedAmount / (metrics.totalBankInflow || 1)) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">待关联合同余额 (未核销)</span>
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Icon name="clock" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold mt-2 text-amber-500">
            ¥{metrics.totalUnlinkedRemain.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            待认领/部分关联: <span className="text-amber-500 font-bold">{metrics.unlinkedCount + metrics.partialCount}</span> 笔
          </div>
        </div>

        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">已生效客户权益总值</span>
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Icon name="award" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold mt-2 text-purple-600 dark:text-purple-400">
            ¥{metrics.totalEntitlementsValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            已激活生效权益: <span className="text-purple-500 font-bold">{metrics.activeEntitlementsCount}</span> 个
          </div>
        </div>

        <div className="bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">待回款激活权益 (锁定)</span>
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Icon name="lock" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold mt-2 text-rose-500">
            {metrics.inactiveEntitlementsCount} <span className="text-xs font-normal text-zinc-400">个权益包</span>
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1">需完成流水关联回款后自动激活</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121316] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Icon name="search" className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                activeTab === 'statements'
                  ? '搜索银行流水号、付款对手企业、银行名称...'
                  : activeTab === 'settlements'
                  ? '搜索回款单号、签约客户、关联合同号...'
                  : '搜索权益编号、客户名称、权益包名...'
              }
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            size="sm"
            variant="filter"
            options={
              activeTab === 'statements'
                ? [
                    { value: '', label: '全部关联状态' },
                    { value: 'unlinked', label: '待关联核销 (unlinked)' },
                    { value: 'partial', label: '部分关联结算 (partial)' },
                    { value: 'settled', label: '已全额关联 (settled)' },
                  ]
                : activeTab === 'settlements'
                ? [
                    { value: '', label: '全部对账状态' },
                    { value: 'audited', label: '已审核入账 (audited)' },
                    { value: 'pending', label: '待财务审核 (pending)' },
                  ]
                : [
                    { value: '', label: '全部权益状态' },
                    { value: 'active', label: '生效中 (已回款激活)' },
                    { value: 'inactive', label: '待回款激活 (锁定中)' },
                  ]
            }
          />
        </div>

        <div className="text-xs text-zinc-400">
          当前视图收录: <span className="font-bold text-brand-600 dark:text-blue-400">
            {activeTab === 'statements'
              ? filteredStatements.length
              : activeTab === 'settlements'
              ? filteredPayments.length
              : filteredEntitlements.length}
          </span> 笔记录
        </div>
      </div>

      {/* VIEW 1: 银行流水台账 (Bank Statements) */}
      {activeTab === 'statements' && (
        <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-4 bg-zinc-50/60 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <span>银行对公电汇流水清单</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  （每笔电汇流水需关联对应合同/系统订单，方可完成回款结算并自动激活权益）
                </span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-500">
              提示：支持【全额关联】一次性结清，或【部分关联】按金额拆分核销
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400">正在调取银行对公流水数据...</div>
          ) : filteredStatements.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400">暂无符合条件的银行流水记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
                  <tr>
                    <th className="py-3 px-4">流水单号 / 摘要</th>
                    <th className="py-3 px-4">付款方对手户名</th>
                    <th className="py-3 px-4">结算银行与账户</th>
                    <th className="py-3 px-4">流水总额</th>
                    <th className="py-3 px-4">已关联金额</th>
                    <th className="py-3 px-4">剩余待关联余额</th>
                    <th className="py-3 px-4">关联核销状态</th>
                    <th className="py-3 px-4">交易时间</th>
                    <th className="py-3 px-4 text-right">结算操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredStatements.map((stmt) => (
                    <tr key={stmt.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{stmt.statementNo}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">{stmt.summary || '对公电汇'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{stmt.counterparty}</td>
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-800 dark:text-zinc-200">{stmt.bankName}</div>
                        <div className="text-[10px] font-mono text-zinc-400">{stmt.bankAccount}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        ¥{Number(stmt.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        ¥{Number(stmt.linkedAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        ¥{Number(stmt.remainAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {stmt.status === 'settled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-500/20">
                            <Icon name="check-circle" className="w-3 h-3" />
                            <span>已全额关联核销</span>
                          </span>
                        ) : stmt.status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-500/20">
                            <Icon name="git-merge" className="w-3 h-3" />
                            <span>部分关联结算</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-500/20">
                            <Icon name="alert-circle" className="w-3 h-3" />
                            <span>待关联核销</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">{stmt.txDate || '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {stmt.remainAmount > 0.01 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenLinkModal(stmt)}
                              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="将此银行流水关联至系统订单完成回款结算"
                            >
                              <Icon name="link" className="w-3.5 h-3.5" />
                              <span>关联订单结算</span>
                            </button>
                          ) : (
                            <span className="text-zinc-400 text-xs px-2 py-1">已结清</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(stmt)}
                            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            回单
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: 回款结算单台账 (Settled Payment Records) */}
      {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="p-4 bg-zinc-50/60 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              回款核销入账单明细
            </div>
            <div className="text-xs text-zinc-400">
              累计核准到账: <span className="font-mono font-bold text-emerald-600">¥{metrics.auditedPaymentsTotal.toLocaleString()}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400">正在调取回款核销记录...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400">暂无回款结算记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
                  <tr>
                    <th className="py-3 px-4">回款编号 / 关联合同</th>
                    <th className="py-3 px-4">来源银行流水号</th>
                    <th className="py-3 px-4">签约客户主体</th>
                    <th className="py-3 px-4">核销金额</th>
                    <th className="py-3 px-4">关联模式</th>
                    <th className="py-3 px-4">款项性质</th>
                    <th className="py-3 px-4">到账日期</th>
                    <th className="py-3 px-4">对账审核状态</th>
                    <th className="py-3 px-4">发票状态</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.paymentNo}</div>
                        <div className="text-[10px] text-zinc-400">合同: {p.contractNo || '未绑定'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.bankStatementNo ? (
                          <span className="font-mono px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                            {p.bankStatementNo}
                          </span>
                        ) : (
                          <span className="text-zinc-400">手动登记流水</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">{p.customerName}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 text-sm">
                        ¥{Number(p.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.associationType === 'partial' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-600 font-medium border border-purple-300/40">
                            部分关联
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-medium border border-emerald-300/40">
                            全额关联
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.type === 'prepayment' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium">首付款</span>
                        ) : p.type === 'milestone' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-medium">进度款</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-600 font-medium">尾款结清</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{p.paymentDate || '-'}</td>
                      <td className="py-3.5 px-4">
                        {p.status === 'audited' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                            审核入账 ✅ ({p.auditBy || '系统自动'})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-300">
                            待财务核准
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.invoiceStatus === 'issued' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 text-[11px] font-medium">
                            已开专票
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px]">
                            未开票
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => showToast(`调取回款单【${p.paymentNo}】的银行原始电汇回单...`)}
                          className="px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs cursor-pointer"
                        >
                          电子凭单
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: 客户权益中心与等价置换 (Customer Entitlements Center) */}
      {activeTab === 'entitlements' && (
        <div className="space-y-6">
          {/* Policy description banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-brand-500/10 to-blue-500/10 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold shrink-0">
                <Icon name="sparkles" className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                  客户权益资产自动激活与等价平移置换规则说明：
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 mt-0.5 block">
                  1. 客户签订合同订单后，权益处于【待回款激活】锁定状态；只有当银行流水完成关联结算（全额或部分回款）后，权益包自动生效。<br />
                  2. 权益生效后，客户可自由选择在【同等公允价值】（如 ¥50,000 或 ¥100,000）的权益包之间随时等额平移切换，无须补差价，系统完整留存变更审计履历。
                </span>
              </div>
            </div>
          </div>

          {/* Entitlements Table */}
          <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="p-4 bg-zinc-50/60 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <span>签约客户权益名册</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  （已绑定关联合同订单及对应关联流水凭证）
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                生效中权益: <span className="text-emerald-500 font-bold font-mono">{metrics.activeEntitlementsCount}</span> / 待回款: <span className="text-rose-500 font-bold font-mono">{metrics.inactiveEntitlementsCount}</span>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-zinc-400">正在调取客户权益资产明细...</div>
            ) : filteredEntitlements.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400">暂无客户权益记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase">
                    <tr>
                      <th className="py-3 px-4">权益编号 / 关联合同</th>
                      <th className="py-3 px-4">客户主体</th>
                      <th className="py-3 px-4">当前权益名称</th>
                      <th className="py-3 px-4">权益分类</th>
                      <th className="py-3 px-4">公允等价值</th>
                      <th className="py-3 px-4">权益生效状态</th>
                      <th className="py-3 px-4">激活时间 / 关联流水</th>
                      <th className="py-3 px-4">包含权益清单</th>
                      <th className="py-3 px-4 text-right">等价切换操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredEntitlements.map((ent) => {
                      const feats = parseFeatures(ent.features);
                      return (
                        <tr key={ent.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{ent.entitlementNo}</div>
                            <div className="text-[10px] text-zinc-400">合同: {ent.contractNo || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                            {ent.customerName}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-brand-600 dark:text-blue-400 flex items-center gap-1.5">
                              <Icon name="package" className="w-3.5 h-3.5" />
                              <span>{ent.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                              {ent.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                            ¥{Number(ent.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4">
                            {ent.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>生效中 (已回款)</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-[11px] border border-rose-500/20"
                                title="订单尚未完成流水回款结算，权益暂时锁定"
                              >
                                <Icon name="lock" className="w-3 h-3" />
                                <span>待回款激活</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {ent.status === 'active' ? (
                              <div>
                                <div className="text-[11px] font-mono text-zinc-900 dark:text-zinc-100">{ent.activatedAt || '已生效'}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">流水: {ent.bankStatementNo || '已对账'}</div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-zinc-400 italic">回款核销后激活</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {feats.map((f, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 truncate"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {ent.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSwitchModal(ent)}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="在同等面值的权益包之间自由平移置换"
                                >
                                  <Icon name="refresh-cw" className="w-3.5 h-3.5" />
                                  <span>切换等价权益</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('statements');
                                    showToast('请在银行流水台账中选择对应的到账流水进行关联结算，完成回款后权益即可自动激活！', 'info');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-medium cursor-pointer"
                                >
                                  去关联回款激活
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenHistoryModal(ent)}
                                className="px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 text-xs cursor-pointer"
                                title="查看历史等价切换履历"
                              >
                                履历
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: 银行流水关联系统订单完成回款结算 (Bank Statement Order Link Modal) */}
      {linkModalOpen && selectedStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-blue-400 flex items-center justify-center">
                  <Icon name="link" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    银行流水关联系统订单 · 完成回款结算
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    选择目标合同订单进行核销，支持全额关联或自定义部分关联，回款后激活权益
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Current Statement Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">当前所选银行电汇流水：</span>
                <span className="font-mono font-bold text-brand-600 dark:text-blue-400">{selectedStatement.statementNo}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                <div>
                  <span className="text-zinc-400">付款企业: </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedStatement.counterparty}</span>
                </div>
                <div>
                  <span className="text-zinc-400">开户行: </span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedStatement.bankName}</span>
                </div>
                <div>
                  <span className="text-zinc-400">流水总金额: </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">¥{Number(selectedStatement.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-zinc-400">剩余待核销余额: </span>
                  <span className="font-mono font-bold text-amber-500">¥{Number(selectedStatement.remainAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitAssociation} className="space-y-4 text-xs">
              {/* Select Target Contract */}
              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  选择目标关联合同 / 系统订单 <span className="text-rose-500">*</span>
                </label>
                <Select
                  id="target-contract-select"
                  value={targetContractId}
                  onChange={(val) => setTargetContractId(val)}
                  options={contractOptions}
                  placeholder="请选择需要核销回款的目标合同/系统订单..."
                  fullWidth
                  size="md"
                  icon="file-check"
                />
                {currentTargetContract && (
                  <div className="mt-1.5 text-[11px] text-zinc-500 flex items-center justify-between px-1">
                    <span>签约客户: <strong className="text-zinc-800 dark:text-zinc-200">{currentTargetContract.customerName}</strong></span>
                    <span>合同标的: ¥{Number(currentTargetContract.amount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Association Mode (全额关联 vs 部分关联) */}
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300">
                  关联核销结算模式 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      associateType === 'full'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-blue-300 ring-2 ring-brand-500/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assocMode"
                      value="full"
                      checked={associateType === 'full'}
                      onChange={() => setAssociateType('full')}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <div className="font-bold text-xs">全额关联核销 (Full)</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">自动核销流水全部可用余额</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      associateType === 'partial'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-blue-300 ring-2 ring-brand-500/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assocMode"
                      value="partial"
                      checked={associateType === 'partial'}
                      onChange={() => {
                        setAssociateType('partial');
                        if (!customAmount) setCustomAmount(String(Math.min(selectedStatement.remainAmount, 100000)));
                      }}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <div className="font-bold text-xs">部分关联结算 (Partial)</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">自定义输入本次拆分核销额度</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Amount Inputs */}
              {associateType === 'partial' ? (
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    本次部分关联结算金额 (¥) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={selectedStatement.remainAmount}
                    min="1"
                    required
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`最大可核销 ¥${selectedStatement.remainAmount}`}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                  />
                  <div className="text-[11px] text-zinc-400 mt-1 flex justify-between">
                    <span>该流水当前最大可关联: ¥{Number(selectedStatement.remainAmount).toLocaleString()}</span>
                    <span>核销后结余: ¥{Math.max(0, selectedStatement.remainAmount - (parseFloat(customAmount) || 0)).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">本次全额核销入账金额：</span>
                  <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                    ¥{Number(selectedStatement.remainAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Payment Type and Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">款项性质</label>
                  <Select
                    id="payment-type-select"
                    value={paymentType}
                    onChange={(val) => setPaymentType(val)}
                    options={paymentTypeOptions}
                    fullWidth
                    size="md"
                    icon="tag"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">结算经办人</label>
                  <input
                    type="text"
                    disabled
                    value={`${auth.user?.realName || '当前用户'} (${auth.role?.name || '销售总监'})`}
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">回款核销说明 / 备注</label>
                <input
                  type="text"
                  value={associateNote}
                  onChange={(e) => setAssociateNote(e.target.value)}
                  placeholder="例如：对公电汇首付款核销，已核验网银电子回执单"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Entitlement activation prompt */}
              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
                <Icon name="check-circle" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <strong>权益自动生效机制：</strong> 本次关联结算完成后，系统将自动把客户【{currentTargetContract?.customerName || '签约主体'}】对应的锁定权益包状态切换为<strong>【生效中】</strong>，客户可在“客户权益中心”随时等价置换。
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={associating}
                  className="px-6 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {associating ? (
                    <>
                      <Icon name="loader" className="w-3.5 h-3.5 animate-spin" />
                      <span>正在关联核销...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="w-3.5 h-3.5" />
                      <span>确认完成关联并结算回款</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 切换等价权益 (Switch Equivalent Entitlement Modal) */}
      {switchModalOpen && selectedEntitlement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Icon name="refresh-cw" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    客户等价权益置换中心
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    严格限定同等公允面值（¥{Number(selectedEntitlement.value).toLocaleString()}）无缝置换，无需补差价
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Entitlement Pill */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-xs">
              <div className="text-zinc-400 mb-1">当前客户正在生效的权益包：</div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mr-2">
                    {selectedEntitlement.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {selectedEntitlement.category}
                  </span>
                </div>
                <div className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">
                  公允价值: ¥{Number(selectedEntitlement.value).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2">
                客户主体: <strong className="text-zinc-700 dark:text-zinc-300">{selectedEntitlement.customerName}</strong> · 关联合同: {selectedEntitlement.contractNo}
              </div>
            </div>

            <form onSubmit={handleSubmitSwitch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                  选择置换目标等价权益包（价值等额 ¥{Number(selectedEntitlement.value).toLocaleString()}） <span className="text-rose-500">*</span>
                </label>

                <div className="space-y-2.5">
                  {EQUIVALENT_PACKAGES_CATALOG.filter(
                    (pkg) => pkg.value === selectedEntitlement.value && pkg.name !== selectedEntitlement.name
                  ).map((pkg) => {
                    const isSelected = targetPackageName === pkg.name;
                    return (
                      <label
                        key={pkg.name}
                        className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                            : 'border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="targetPkg"
                              value={pkg.name}
                              checked={isSelected}
                              onChange={() => setTargetPackageName(pkg.name)}
                              className="mt-0.5 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{pkg.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                                  {pkg.tag}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {pkg.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">{pkg.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {pkg.features.map((f, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                                  >
                                    ✓ {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-emerald-600 shrink-0">
                            等额 ¥{Number(pkg.value).toLocaleString()}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  切换原因 / 业务变更说明 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={switchReason}
                  onChange={(e) => setSwitchReason(e.target.value)}
                  placeholder="例如：客户数字化团队决策调整，优先将私有化实施包置换为等额 AI 算力与智能助手服务"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSwitchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={switching}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {switching ? (
                    <>
                      <Icon name="loader" className="w-3.5 h-3.5 animate-spin" />
                      <span>正在平移切换...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="w-3.5 h-3.5" />
                      <span>确认平移切换等价权益</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: 权益变更履历审计弹窗 (Switch History Modal) */}
      {historyModalOpen && historyEntitlement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="history" className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  等价权益置换履历 · {historyEntitlement.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              当前有效权益: <strong className="text-zinc-800 dark:text-zinc-200">{historyEntitlement.name}</strong> (¥{Number(historyEntitlement.value).toLocaleString()})
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {parsedHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  该权益尚未发生过等价置换平移操作（原始权益包正在生效）
                </div>
              ) : (
                parsedHistory.map((h, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        【{h.fromName}】 ➔ 【{h.toName}】
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">{h.switchedAt}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      经办操作员: <strong>{h.operator}</strong> · 额度等值平移: <strong>¥{Number(h.value).toLocaleString()}</strong>
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900/60 p-2 rounded-xl">
                      置换原因: {h.reason}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: 银行电子电汇回单预览 (Bank Electronic Receipt Modal) */}
      {receiptModalOpen && receiptStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icon name="file-text" className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  银行对公电汇电子回单凭证
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-xl"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{receiptStatement.bankName}</div>
                <div className="text-[10px] text-zinc-400">电子电汇入账回执凭单 (CNAPS 联行系统)</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-zinc-400">流水凭证号:</span> {receiptStatement.statementNo}</div>
                <div><span className="text-zinc-400">到账时间:</span> {receiptStatement.txDate}</div>
                <div><span className="text-zinc-400">付款人户名:</span> {receiptStatement.counterparty}</div>
                <div><span className="text-zinc-400">付款人账号:</span> {receiptStatement.bankAccount}</div>
                <div><span className="text-zinc-400">收款人户名:</span> 领航数智云科技(华东)有限公司</div>
                <div><span className="text-zinc-400">交易币种:</span> 人民币 (CNY)</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                <div className="text-xs text-zinc-500">交易金额 (大写及阿拉伯数字)</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ¥{Number(receiptStatement.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-[11px] text-zinc-400">
                摘要附言: {receiptStatement.summary || '对公企业服务款项'}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  showToast('正在导出并下载 PDF 高清银行电子凭单...');
                  setReceiptModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                <span>下载电子凭单 (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
