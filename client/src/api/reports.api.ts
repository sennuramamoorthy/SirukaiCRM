import api from './axios';

export const reportsApi = {
  getDashboardKpis: () => api.get('/reports/dashboard').then((r) => r.data.data),
  getSales: (params?: Record<string, string>) => api.get('/reports/sales', { params }).then((r) => r.data.data),
  getRevenue: (params?: Record<string, string>) => api.get('/reports/revenue', { params }).then((r) => r.data.data),
  getTopProducts: (params?: Record<string, string>) => api.get('/reports/top-products', { params }).then((r) => r.data.data),
  getTopCustomers: (params?: Record<string, string>) => api.get('/reports/top-customers', { params }).then((r) => r.data.data),
  getInventoryValuation: () => api.get('/reports/inventory-valuation').then((r) => r.data.data),
  getOrderStatus: () => api.get('/reports/order-status').then((r) => r.data.data),
  getInvoiceAging: () => api.get('/reports/invoice-aging').then((r) => r.data.data),
};
