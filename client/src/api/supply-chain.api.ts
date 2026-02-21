import api from './axios';

export const supplyChainApi = {
  // Suppliers
  listSuppliers: (params?: Record<string, string | number>) =>
    api.get('/suppliers', { params }).then((r) => r.data),
  getSupplier: (id: number) => api.get(`/suppliers/${id}`).then((r) => r.data.data),
  createSupplier: (data: unknown) => api.post('/suppliers', data).then((r) => r.data.data),
  updateSupplier: (id: number, data: unknown) => api.put(`/suppliers/${id}`, data).then((r) => r.data.data),
  deleteSupplier: (id: number) => api.delete(`/suppliers/${id}`).then((r) => r.data),
  getSupplierProducts: (id: number) => api.get(`/suppliers/${id}/products`).then((r) => r.data.data),

  // Purchase Orders
  listPOs: (params?: Record<string, string | number>) =>
    api.get('/purchase-orders', { params }).then((r) => r.data),
  getPO: (id: number) => api.get(`/purchase-orders/${id}`).then((r) => r.data.data),
  createPO: (data: unknown) => api.post('/purchase-orders', data).then((r) => r.data.data),
  updatePoStatus: (id: number, status: string) =>
    api.patch(`/purchase-orders/${id}/status`, { status }).then((r) => r.data.data),
  receivePO: (id: number, items: unknown) =>
    api.post(`/purchase-orders/${id}/receive`, { items }).then((r) => r.data.data),

  // Shipments
  listShipments: (params?: Record<string, string | number>) =>
    api.get('/shipments', { params }).then((r) => r.data),
  getShipment: (id: number) => api.get(`/shipments/${id}`).then((r) => r.data.data),
  createShipment: (data: unknown) => api.post('/shipments', data).then((r) => r.data.data),
  updateShipmentStatus: (id: number, data: unknown) =>
    api.patch(`/shipments/${id}/status`, data).then((r) => r.data.data),
};
