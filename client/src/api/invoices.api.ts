import api from './axios';

export const invoicesApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/invoices', { params }).then((r) => r.data),

  getById: (id: number) => api.get(`/invoices/${id}`).then((r) => r.data.data),

  updateStatus: (id: number, data: { status: string; amount_paid_cents?: number; notes?: string }) =>
    api.patch(`/invoices/${id}/status`, data).then((r) => r.data.data),
};
