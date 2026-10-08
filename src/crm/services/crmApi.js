import { useSyncExternalStore } from 'react';

const TOKEN_KEY = 'acme_crm_jwt_token';
const AUTH_KEY = 'acme_crm_auth_session';

const DEFAULT_AUTH = {
  token: '',
  user: null,
  role: null,
  roles: [],
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
};
