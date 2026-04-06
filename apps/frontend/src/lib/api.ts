/**
 * API client for ERMS backend (Django). Base URL from VITE_API_URL.
 * All endpoints return camelCase to match frontend types.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const API = `${BASE}/api`;

const REQUEST_TIMEOUT_MS = 30_000;

/** Thrown for non-2xx responses; includes HTTP status for retry / UI logic. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        if (typeof body.detail === 'string') {
          msg = body.detail;
        } else if (typeof body.detail === 'object' && body.detail !== null) {
          msg = Object.values(body.detail).flat().join('; ');
        } else {
          const fieldErrors = Object.entries(body)
            .filter(([, v]) => Array.isArray(v))
            .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
            .join('; ');
          if (fieldErrors) msg = fieldErrors;
        }
      } catch {
        // non-JSON error body — use statusText
      }
      throw new ApiError(msg, res.status);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Inventory
export const inventoryApi = {
  list: (params?: { q?: string; category?: string }) => {
    const search = params ? new URLSearchParams(params).toString() : '';
    return request<Array<import('@/data/types').InventoryItem>>(
      `/inventory/${search ? `?${search}` : ''}`
    );
  },
  get: (id: string) =>
    request<import('@/data/types').InventoryItem>(`/inventory/${id}/`),
  create: (body: Omit<import('@/data/types').InventoryItem, 'id'>) =>
    request<import('@/data/types').InventoryItem>('/inventory/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<import('@/data/types').InventoryItem>) =>
    request<import('@/data/types').InventoryItem>(`/inventory/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<void>(`/inventory/${id}/`, { method: 'DELETE' }),
};

// Suppliers
export const suppliersApi = {
  list: () =>
    request<Array<import('@/data/types').Supplier>>('/suppliers/'),
  get: (id: string) =>
    request<import('@/data/types').Supplier>(`/suppliers/${id}/`),
  create: (body: Omit<import('@/data/types').Supplier, 'id'>) =>
    request<import('@/data/types').Supplier>('/suppliers/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<import('@/data/types').Supplier>) =>
    request<import('@/data/types').Supplier>(`/suppliers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<void>(`/suppliers/${id}/`, { method: 'DELETE' }),
};

// Requests
export const requestsApi = {
  list: (params?: { status?: string }) => {
    const search = params ? new URLSearchParams(params).toString() : '';
    return request<Array<import('@/data/types').ItemRequest>>(
      `/requests/${search ? `?${search}` : ''}`
    );
  },
  create: (body: Omit<import('@/data/types').ItemRequest, 'id' | 'status'>) =>
    request<import('@/data/types').ItemRequest>('/requests/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateStatus: (id: string, status: import('@/data/types').ItemRequest['status']) =>
    request<import('@/data/types').ItemRequest>(`/requests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// Borrowed
export const borrowedApi = {
  list: (params?: { status?: string }) => {
    const search = params ? new URLSearchParams(params).toString() : '';
    return request<Array<import('@/data/types').BorrowedItem>>(
      `/borrowed/${search ? `?${search}` : ''}`
    );
  },
  return: (id: string) =>
    request<import('@/data/types').BorrowedItem>(`/borrowed/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'return' }),
    }),
  extendDate: (id: string, expectedReturnDate: string) =>
    request<import('@/data/types').BorrowedItem>(`/borrowed/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedReturnDate }),
    }),
};

// Activity
export const activityApi = {
  list: (params?: { limit?: number }) => {
    const search = params?.limit
      ? new URLSearchParams({ limit: String(params.limit) }).toString()
      : '';
    return request<Array<import('@/data/types').ActivityEntry>>(
      `/activity/${search ? `?${search}` : ''}`
    );
  },
};

// Reports
export const reportsApi = {
  monthlyUsage: () =>
    request<Array<import('@/data/types').MonthlyUsageRow>>('/reports/monthly-usage/'),
  borrowLeaderboard: (limit = 10) =>
    request<Array<import('@/data/types').BorrowLeaderboardRow>>(`/reports/borrow-leaderboard/?limit=${limit}`),
};

// AI Insights
export const aiApi = {
  query: (question: string) =>
    request<import('@/data/types').AIQueryResponse>('/ai/query/', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  getInsights: () =>
    request<{ insights: Array<import('@/data/types').InsightRecord>; meta?: import('@/data/types').AIMeta }>('/ai/insights/'),
  generateInsights: () =>
    request<{ insights: Array<import('@/data/types').InsightRecord>; meta: import('@/data/types').AIMeta }>('/ai/insights/', {
      method: 'POST',
    }),
  insightFeedback: (id: string, body: { feedback?: string; comment?: string; status?: string }) =>
    request<import('@/data/types').InsightRecord>(`/ai/insights/${id}/feedback/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  simulateReorder: (itemId: string) =>
    request<{ simulation: import('@/data/types').ReorderSimulation | null; meta: import('@/data/types').AIMeta }>('/ai/simulate-reorder/', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),
  getSuggestions: (status?: string) =>
    request<Array<import('@/data/types').AISuggestion>>(
      status ? `/ai/suggestions/?status=${encodeURIComponent(status)}` : '/ai/suggestions/',
    ),
  suggestionAction: (id: string, action: string, extra?: Record<string, string>) =>
    request<import('@/data/types').AISuggestion>(`/ai/suggestions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ action, ...extra }),
    }),
  usageStats: (days?: number) => {
    const search = days ? `?days=${days}` : '';
    return request<import('@/data/types').AIUsageStats>(`/ai/usage/${search}`);
  },
};

// Analytics
export const analyticsApi = {
  kpiLatest: () =>
    request<import('@/data/types').KPISnapshot>('/analytics/kpi/'),
  stockHealth: () =>
    request<import('@/data/types').StockHealth>('/analytics/stock-health/'),
};

// Alerts
export const alertsApi = {
  list: (params?: { status?: string; severity?: string; type?: string }) => {
    const search = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<Array<import('@/data/types').AlertRecord>>(`/alerts/${search ? `?${search}` : ''}`);
  },
  action: (id: string, status: string) =>
    request<import('@/data/types').AlertRecord>(`/alerts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  computeRisks: () =>
    request<{ computed: boolean; riskScores: number; alertsGenerated: number }>('/alerts/compute/', {
      method: 'POST',
    }),
};
