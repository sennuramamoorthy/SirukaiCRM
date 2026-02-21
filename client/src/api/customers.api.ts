import api from './axios';

export const customersApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/customers', { params }).then((r) => r.data),

  getById: (id: number) => api.get(`/customers/${id}`).then((r) => r.data.data),

  create: (data: unknown) => api.post('/customers', data).then((r) => r.data.data),

  update: (id: number, data: unknown) =>
    api.put(`/customers/${id}`, data).then((r) => r.data.data),

  delete: (id: number) => api.delete(`/customers/${id}`).then((r) => r.data),

  getOrders: (id: number) => api.get(`/customers/${id}/orders`).then((r) => r.data.data),

  getInvoices: (id: number) => api.get(`/customers/${id}/invoices`).then((r) => r.data.data),
};
