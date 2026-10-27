import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'acme_crm_data_v1';

const INITIAL_DATA = {
  leads: [
    {
      id: 'lead-1',
      company: '上海哔哩哔哩科技有限公司',
      name: '张博雅',
      contact: '张博雅 · 139****1182',
      level: { className: 'px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 font-bold text-[10px]', text: 'A级 · 高意向' },
      channel: '2026 全球智能大会展台',
      status: { className: 'text-amber-500 font-medium', text: '跟进中' },
      owner: '陈明',
      convertible: true,
      createdAt: '2026-09-28 10:20',
    },
    {
      id: 'lead-2',
      company: '南京中兴软创科技',
      name: '刘建军',
      contact: '刘建军 · 138****9923',
      level: { className: 'px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 font-bold text-[10px]', text: 'B级 · 中意向' },
      channel: '官方网站表单留资',
      status: { className: 'text-blue-500 font-medium', text: '待跟进' },
      owner: '李晓鹏',
      convertible: true,
      createdAt: '2026-09-29 14:15',
    },
    {
      id: 'lead-3',
      company: '苏州汇川技术股份有限公司',
      name: '朱伟',
      contact: '朱伟 · 150****6621',
      level: { className: 'px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 font-bold text-[10px]', text: 'A级 · 高意向' },
      channel: '老客户转介绍',
      status: { className: 'text-emerald-500 font-medium', text: '已转商机' },
      owner: '陈明',
      convertible: false,
      createdAt: '2026-09-27 16:30',
    },
  ],
  deals: [
    {
      id: 'deal-hikvision',
      name: '海康威视',
      desc: '视觉AI模型私有化',
      amount: 600000,
      stage: '初步接洽', // '初步接洽' | '方案呈现' | '商务谈判' | '赢单签约'
      owner: '陈明',
    },
    {
      id: 'deal-sugon',
      name: '中科曙光',
      desc: '超算作业调度软件',
      amount: 1200000,
      stage: '初步接洽',
      owner: '李晓鹏',
    },
    {
      id: 'deal-sf',
      name: '顺丰科技',
      desc: '供应链端到端调度',
      amount: 850000,
      stage: '方案呈现',
      owner: '陈明',
    },
    {
      id: 'deal-geely',
      name: '吉利汽车研究院',
      desc: '车载计算仿真套件',
      amount: 1800000,
      stage: '方案呈现',
      owner: '王雪',
    },
    {
      id: 'deal-cmcc',
      name: '中国移动苏州研发院',
      desc: '算力编排云原生平台',
      amount: 2400000,
      stage: '商务谈判',
      owner: '陈明',
    },
    {
      id: 'deal-dahua',
      name: '大华股份',
      desc: '智慧物联数据底座',
      amount: 3200000,
      stage: '赢单签约',
      owner: '陈明',
    },
  ],
  customers: [
    {
      id: 'cust-1',
      name: '大华技术股份有限公司',
      level: 'KA核心客户',
      industry: '智能安防 / 物联网',
      owner: '陈明',
      dealsCount: 3,
      totalAmount: '¥4.8M',
      health: '极健康',
      lastContact: '2026-09-29',
    },
    {
      id: 'cust-2',
      name: '吉利汽车研究院',
      level: '战略大客户',
      industry: '智能制造 / 车载OS',
      owner: '王雪',
      dealsCount: 2,
      totalAmount: '¥2.6M',
      health: '健康',
      lastContact: '2026-09-28',
    },
    {
      id: 'cust-3',
      name: '顺丰科技有限公司',
      level: '高潜成长客户',
      industry: '现代智慧物流',
      owner: '陈明',
      dealsCount: 1,
      totalAmount: '¥850K',
      health: '需关注',
      lastContact: '2026-09-25',
    },
  ],
  followups: [
    {
      id: 'fup-1',
      company: '大华技术股份有限公司',
      type: '现场技术交流',
      date: '2026-09-29 15:30',
      contact: '刘总工',
      summary: '双方对 Q4 交付计划及分布式算力底座测试方案完成终版敲定，准备进入回款请款流程。',
      nextPlan: '国庆节后发起第一期回款开票',
    },
  ],
};

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[crmStore] Failed to load localStorage', e);
  }
  return INITIAL_DATA;
}

let state = loadStorage();
const listeners = new Set();

function emitChange() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[crmStore] Failed to save to localStorage', e);
  }
  listeners.forEach((listener) => listener());
}

export const crmStore = {
  getSnapshot: () => state,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Actions
  addLead: (lead) => {
    const newLead = {
      id: `lead-${Date.now()}`,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      status: { className: 'text-blue-500 font-medium', text: '待跟进' },
      level: { className: 'px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 font-bold text-[10px]', text: 'A级 · 高意向' },
      owner: '陈明',
      convertible: true,
      ...lead,
    };
    state = {
      ...state,
      leads: [newLead, ...state.leads],
    };
    emitChange();
    return newLead;
  },

  convertLeadToDeal: (leadId, dealData) => {
    state = {
      ...state,
      leads: state.leads.map((l) =>
        l.id === leadId
          ? { ...l, status: { className: 'text-emerald-500 font-medium', text: '已转商机' }, convertible: false }
          : l
      ),
      deals: [
        {
          id: `deal-${Date.now()}`,
          name: dealData.company,
          desc: dealData.title,
          amount: Number(dealData.amount) || 500000,
          stage: '初步接洽',
          owner: '陈明',
        },
        ...state.deals,
      ],
    };
    emitChange();
  },

  addDeal: (deal) => {
    const newDeal = {
      id: `deal-${Date.now()}`,
      stage: '初步接洽',
      owner: '陈明',
      ...deal,
      amount: Number(deal.amount) || 0,
    };
    state = {
      ...state,
      deals: [newDeal, ...state.deals],
    };
    emitChange();
    return newDeal;
  },

  updateDealStage: (dealId, nextStage) => {
    state = {
      ...state,
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, stage: nextStage } : d)),
    };
    emitChange();
  },

  addFollowup: (company, record) => {
    const newRecord = {
      id: `fup-${Date.now()}`,
      company,
      date: new Date().toLocaleString('zh-CN', { hour12: false }),
      ...record,
    };
    state = {
      ...state,
      followups: [newRecord, ...state.followups],
      customers: state.customers.map((c) =>
        c.name === company ? { ...c, lastContact: newRecord.date.split(' ')[0] } : c
      ),
    };
    emitChange();
    return newRecord;
  },

  resetDefaults: () => {
    state = INITIAL_DATA;
    emitChange();
  },
};

export function useCrmStore() {
  return useSyncExternalStore(crmStore.subscribe, crmStore.getSnapshot, () => INITIAL_DATA);
}
