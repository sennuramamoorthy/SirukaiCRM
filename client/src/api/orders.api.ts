import api from './axios';

export const ordersApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/orders', { params }).then((r) => r.data),

  getById: (id: number) => api.get(`/orders/${id}`).then((r) => r.data.data),

  create: (data: unknown) => api.post('/orders', data).then((r) => r.data.data),

  update: (id: number, data: unknown) =>
    api.put(`/orders/${id}`, data).then((r) => r.data.data),

  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then((r) => r.data.data),

  delete: (id: number) => api.delete(`/orders/${id}`).then((r) => r.data),

  generateInvoice: (id: number) =>
    api.post(`/orders/${id}/invoice`).then((r) => r.data.data),
};
