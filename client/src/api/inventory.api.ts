import api from './axios';

export const inventoryApi = {
  // Products
  listProducts: (params?: Record<string, string | number>) =>
    api.get('/products', { params }).then((r) => r.data),

  getProduct: (id: number) => api.get(`/products/${id}`).then((r) => r.data.data),

  createProduct: (data: unknown) => api.post('/products', data).then((r) => r.data.data),

  updateProduct: (id: number, data: unknown) =>
    api.put(`/products/${id}`, data).then((r) => r.data.data),

  deleteProduct: (id: number) => api.delete(`/products/${id}`).then((r) => r.data),

  getCategories: () => api.get('/products/categories').then((r) => r.data.data),

  // Inventory
  getLowStock: () => api.get('/inventory/low-stock').then((r) => r.data.data),

  adjustStock: (productId: number, data: unknown) =>
    api.post(`/inventory/${productId}/adjust`, data).then((r) => r.data.data),

  getTransactions: (productId: number) =>
    api.get(`/inventory/${productId}/transactions`).then((r) => r.data.data),
};
