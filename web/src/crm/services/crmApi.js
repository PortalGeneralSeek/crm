import { useSyncExternalStore } from 'react';

// Legacy keys used only for wiping any historical remnant in browser storage
const TOKEN_KEY = 'acme_crm_jwt_token';
const AUTH_KEY = 'acme_crm_auth_session';

try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_KEY);
} catch (e) {
  // Ignore environments without storage access
}

const DEFAULT_AUTH = {
  token: '',
  user: null,
  role: null,
  roles: [],
  permissions: [],
  menus: [],
  isLoggedIn: false,
};

// Pure in-memory session and permission store (Never saved to localStorage or sessionStorage)
let currentAuth = { ...DEFAULT_AUTH };

const listeners = new Set();
function notify() {
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
      roles: data.roles || (data.role ? [data.role] : []),
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
    canAddUser: hasPermission('btn:user:add'),
    canEditUser: hasPermission('btn:user:edit'),
    canAssignRole: hasPermission('btn:role:assign'),
    canDeleteUser: hasPermission('btn:user:delete'),
    canManageRoles: hasPermission('btn:role:edit'),
    canAddRole: hasPermission('btn:role:add'),
    isBranchManager: auth.role?.code === 'sales_director' || auth.role?.code === 'super_admin' || hasPermission('btn:customer:reclaim'),
    canReclaimCustomer: hasPermission('btn:customer:reclaim') || auth.role?.code === 'super_admin' || auth.role?.code === 'sales_director',
    canAssignCustomer: hasPermission('btn:customer:assign') || auth.role?.code === 'super_admin' || auth.role?.code === 'sales_director',
    canClaimCustomer: hasPermission('btn:customer:claim') || true,
  };
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = currentAuth.token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !url.includes('/api/v1/auth/login')) {
      authStore.logout();
      window.dispatchEvent(
        new CustomEvent('crm:auth:expired', {
          detail: data.message || '登录会话已过期或令牌失效，已自动退出',
        })
      );
    }
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

  logout: async () => {
    try {
      await request('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      authStore.logout();
    }
  },

  getCurrentUser: async () => {
    return request('/api/v1/auth/me');
  },

  getDynamicMenus: async () => {
    return request('/api/v1/auth/menus');
  },

  switchRole: async (roleId) => {
    const res = await request('/api/v1/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
    if (res.data) {
      authStore.setSession(res.data);
    }
    return res;
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

  // User Management
  getUsers: async (params = {}) => {
    const q = new URLSearchParams();
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.roleId) q.set('roleId', params.roleId);
    if (params.status !== undefined && params.status !== '') q.set('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/api/v1/users${qs}`);
  },

  createUser: async (userData) => {
    return request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id, userData) => {
    return request(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  updateUserStatus: async (id, status) => {
    return request(`/api/v1/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  resetUserPassword: async (id, newPassword) => {
    return request(`/api/v1/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  deleteUser: async (id) => {
    return request(`/api/v1/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Role & Permissions Matrix
  getRoles: async () => {
    return request('/api/v1/roles');
  },

  createRole: async (roleData) => {
    return request('/api/v1/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  },

  updateRole: async (id, roleData) => {
    return request(`/api/v1/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  },

  deleteRole: async (id) => {
    return request(`/api/v1/roles/${id}`, {
      method: 'DELETE',
    });
  },

  getRolePermissions: async (roleId) => {
    return request(`/api/v1/roles/${roleId}/permissions`);
  },

  updateRolePermissions: async (roleId, menuIds) => {
    return request(`/api/v1/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ menuIds }),
    });
  },

  getPermissionsTree: async () => {
    return request('/api/v1/permissions/tree');
  },

  // Profile & Password
  updateProfile: async (profileData) => {
    return request('/api/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (oldPassword, newPassword) => {
    return request('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // Customers API
  getCustomers: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/customers${qs ? `?${qs}` : ''}`);
  },

  getCustomer: async (id) => {
    return request(`/api/v1/customers/${id}`);
  },

  createCustomer: async (customerData) => {
    return request('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  updateCustomer: async (id, customerData) => {
    return request(`/api/v1/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  deleteCustomer: async (id) => {
    return request(`/api/v1/customers/${id}`, {
      method: 'DELETE',
    });
  },

  reclaimCustomer: async (id, reason) => {
    return request(`/api/v1/customers/${id}/reclaim`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  assignCustomer: async (id, targetUserId, note) => {
    return request(`/api/v1/customers/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ targetUserId, note }),
    });
  },

  claimCustomer: async (id) => {
    return request(`/api/v1/customers/${id}/claim`, {
      method: 'PUT',
    });
  },

  // Contracts API
  getContracts: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/contracts${qs ? `?${qs}` : ''}`);
  },

  createContract: async (contractData) => {
    return request('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
  },

  approveContract: async (id) => {
    return request(`/api/v1/contracts/${id}/approve`, {
      method: 'PUT',
    });
  },

  updateContract: async (id, contractData) => {
    return request(`/api/v1/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contractData),
    });
  },

  deleteContract: async (id) => {
    return request(`/api/v1/contracts/${id}`, {
      method: 'DELETE',
    });
  },

  // Payments API
  getPayments: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/payments${qs ? `?${qs}` : ''}`);
  },

  createPayment: async (paymentData) => {
    return request('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  auditPayment: async (id) => {
    return request(`/api/v1/payments/${id}/audit`, {
      method: 'PUT',
    });
  },

  issueInvoice: async (id) => {
    return request(`/api/v1/payments/${id}/invoice`, {
      method: 'PUT',
    });
  },

  // Bank Statements & Association API (银行流水关联系统订单)
  getBankStatements: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/bank-statements${qs ? `?${qs}` : ''}`);
  },

  associateBankStatement: async (payload) => {
    return request('/api/v1/bank-statements/associate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Customer Entitlements API (客户权益与等价置换)
  getCustomerEntitlements: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/customer-entitlements${qs ? `?${qs}` : ''}`);
  },

  switchCustomerEntitlement: async (id, payload) => {
    return request(`/api/v1/customer-entitlements/${id}/switch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Products API
  getProducts: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/products${qs ? `?${qs}` : ''}`);
  },

  createProduct: async (productData) => {
    return request('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateProduct: async (id, productData) => {
    return request(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  deleteProduct: async (id) => {
    return request(`/api/v1/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/v1/audit/logs${qs ? `?${qs}` : ''}`);
  },

  // AI Copilot
  chatAi: async (prompt) => {
    return request('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // Market & Macro Monitoring
  getMarketQuotes: async () => {
    return request('/api/v1/market/quotes');
  },

  getMarketNews: async () => {
    return request('/api/v1/market/news');
  },

  getMarketMacro: async () => {
    return request('/api/v1/market/macro');
  },

  getMarketPlaybook: async () => {
    return request('/api/v1/market/playbook');
  },
  getUsStocks: async () => {
    return request('/api/v1/market/stocks');
  },

  getMarketKlines: async (symbol, interval, limit, before) => {
    const qs = new URLSearchParams({ symbol, interval: String(interval) });
    if (limit) qs.set('limit', String(limit));
    if (before) qs.set('before', String(before));
    return request(`/api/v1/market/klines?${qs.toString()}`);
  },

  getAuthToken: () => currentAuth.token,

  analyzeMarketAi: async (payload) => {
    return request('/api/v1/market/ai-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  streamMarketAi: async (payload, onChunk, onComplete, onError, signal) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      const token = currentAuth.token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/market/ai-analysis-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}: 请求研报流失败`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      let completedCalled = false;
      const safeComplete = (meta) => {
        if (!completedCalled) {
          completedCalled = true;
          if (onComplete) onComplete(meta);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              safeComplete();
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.delta || parsed.reasoning) {
                onChunk(parsed.delta || '', parsed);
              }
              if (parsed.done) {
                safeComplete(parsed);
              }
            } catch (e) {
              onChunk(dataStr, {});
            }
          }
        }
      }

      safeComplete();
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (onError) onError(err);
      else throw err;
    }
  },

  fetchMarketModels: async (baseUrl, apiKey) => {
    return request('/api/v1/market/models', {
      method: 'POST',
      body: JSON.stringify({ baseUrl, apiKey }),
    });
  },

  // User Permissions
  getUserPermissions: async (userId) => {
    return request(`/api/v1/users/${userId}/permissions`);
  },

  // System Management & Cache Governance
  getSystemInfo: async () => {
    return request('/api/v1/system/info');
  },

  flushCache: async () => {
    return request('/api/v1/system/cache/flush', {
      method: 'POST',
    });
  },
};

