import { useSyncExternalStore } from 'react';

const TOKEN_KEY = 'acme_crm_jwt_token';
const AUTH_KEY = 'acme_crm_auth_session';

const DEFAULT_AUTH = {
  token: '',
  user: null,
  role: null,
  permissions: [],
  menus: [],
  isLoggedIn: false,
};

let currentAuth = (() => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return { ...DEFAULT_AUTH, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[crmApi] parse session error', e);
  }
  return DEFAULT_AUTH;
})();

const listeners = new Set();
function notify() {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentAuth));
    if (currentAuth.token) {
      localStorage.setItem(TOKEN_KEY, currentAuth.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('[crmApi] save session error', e);
  }
  listeners.forEach((l) => l());
}

export const authStore = {
  getSnapshot: () => currentAuth,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession: (data) => {
    currentAuth = {
      token: data.token || '',
      user: data.user || null,
      role: data.role || null,
      permissions: data.permissions || [],
      menus: data.menus || [],
      isLoggedIn: Boolean(data.token),
    };
    notify();
  },
  logout: () => {
    currentAuth = DEFAULT_AUTH;
    notify();
  },
};

export function useAuth() {
  const auth = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
  const permSet = new Set(auth.permissions || []);

  const hasPermission = (permCode) => {
    if (permSet.has('*') || auth.role?.code === 'super_admin') return true;
    return permSet.has(permCode);
  };

  const hasField = (fieldCode) => {
    if (permSet.has('*') || auth.role?.code === 'super_admin') return true;
    return permSet.has(fieldCode);
  };

  return {
    ...auth,
    hasPermission,
    hasField,
    canViewCostPrice: hasField('field:deal:cost_price'),
    canEditPrice: hasField('field:deal:edit_price'),
    canExportDeals: hasPermission('btn:deal:export'),
    canDeleteDeal: hasPermission('btn:deal:delete'),
    canApproveDiscount: hasPermission('btn:deal:approve_discount'),
    canAddDeal: hasPermission('btn:deal:add'),
    canConvertLead: hasPermission('btn:lead:convert'),
  };
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = currentAuth.token || localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: 请求失败`);
  }

  return data;
}

export const crmApi = {
  // Authentication
  login: async (username, password) => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.data) {
      authStore.setSession(res.data);
    }
    return res;
  },

  getCurrentUser: async () => {
    return request('/api/v1/auth/me');
  },

  getDynamicMenus: async () => {
    return request('/api/v1/auth/menus');
  },

  // Deals API
  getDeals: async () => {
    return request('/api/v1/deals');
  },

  createDeal: async (dealData) => {
    return request('/api/v1/deals', {
      method: 'POST',
      body: JSON.stringify(dealData),
    });
  },

  advanceDealStage: async (id, stage) => {
    return request(`/api/v1/deals/${id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage }),
    });
  },

  deleteDeal: async (id) => {
    return request(`/api/v1/deals/${id}`, {
      method: 'DELETE',
    });
  },

  exportDeals: async () => {
    return request('/api/v1/deals/export');
  },

  // Leads API
  getLeads: async () => {
    return request('/api/v1/leads');
  },

  createLead: async (leadData) => {
    return request('/api/v1/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  },

  convertLead: async (id, payload) => {
    return request(`/api/v1/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  exportLeads: async () => {
    return request('/api/v1/leads/export');
  },
};
