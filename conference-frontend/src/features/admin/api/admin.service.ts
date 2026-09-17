import { apiFetch } from '../../../services/auth/auth.service';

export type AdminOverview = {
  kpis: {
    totalOrganizations: number;
    suspendedOrganizations: number;
    totalRooms: number;
    activeUsers: number;
    totalUsers: number;
    meetingsToday: number;
    totalRecordings: number;
    storageUsedGb: number;
    storageLimitGb: number;
    monthlyRevenue: number;
    activeMeetings: number;
  };
  growth: {
    labels: string[];
    meetings: number[];
    users: number[];
    organizations: number[];
  };
  recentOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    members: number;
    ownerName: string;
    ownerEmail: string;
    createdAt: string;
  }>;
  topActiveRooms: Array<{
    id: string;
    name: string;
    members: number;
    meetings: number;
    lastActivity: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    subtitle: string;
    at: string;
    kind: string;
  }>;
  subscriptionOverview: {
    planName: string;
    priceMonthly: number;
    status: string;
    roomsUsed: number;
    roomsLimit: number;
    storageUsedGb: number;
    storageLimitGb: number;
    membersUsed: number;
    membersLimit: number;
  };
  systemHealth: Record<string, 'healthy' | 'degraded' | 'down'>;
};

export const adminApi = {
  claimDevAccess: () =>
    apiFetch<{ promoted: boolean; platformRole: string }>('/admin/claim-dev-access', {
      method: 'POST',
    }),
  overview: () => apiFetch<AdminOverview>('/admin/overview'),
  listWorkspaces: (q: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(
      `/admin/workspaces${qs ? `?${qs}` : ''}`,
    );
  },
  getWorkspace: (id: string) => apiFetch<Record<string, unknown>>(`/admin/workspaces/${id}`),
  createWorkspace: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/admin/workspaces', { method: 'POST', body }),
  setWorkspaceStatus: (id: string, status: 'active' | 'suspended') =>
    apiFetch<Record<string, unknown>>(`/admin/workspaces/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  listUsers: (q: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<{ items: Array<Record<string, unknown>>; total: number }>(
      `/admin/users${qs ? `?${qs}` : ''}`,
    );
  },
  getUser: (id: string) => apiFetch<Record<string, unknown>>(`/admin/users/${id}`),
  createUser: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/admin/users', { method: 'POST', body }),
  setUserStatus: (id: string, accountStatus: 'active' | 'suspended' | 'banned') =>
    apiFetch<Record<string, unknown>>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { accountStatus },
    }),
  listPlans: () => apiFetch<{ items: Array<Record<string, unknown>> }>('/admin/plans'),
  updatePlan: (key: string, body: Record<string, unknown>) =>
    apiFetch<{ items: Array<Record<string, unknown>> }>(`/admin/plans/${key}`, {
      method: 'PATCH',
      body,
    }),
  listSubscriptions: (q: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<{
      kpis: Record<string, number>;
      items: Array<Record<string, unknown>>;
      total: number;
    }>(`/admin/subscriptions${qs ? `?${qs}` : ''}`);
  },
  billing: () => apiFetch<Record<string, unknown>>('/admin/billing'),
  invoices: (q: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<{ items: Array<Record<string, unknown>>; total: number }>(
      `/admin/invoices${qs ? `?${qs}` : ''}`,
    );
  },
  auditLogs: (q: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<{ items: Array<Record<string, unknown>>; total: number }>(
      `/admin/audit-logs${qs ? `?${qs}` : ''}`,
    );
  },
  getSystemSettings: () => apiFetch<Record<string, unknown>>('/admin/system-settings'),
  updateSystemSettings: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/admin/system-settings', { method: 'PATCH', body }),
};
