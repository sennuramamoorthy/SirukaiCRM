export const ORDER_STATUSES = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const PO_STATUSES = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'] as const;
export type PoStatus = typeof PO_STATUSES[number];

export const SHIPMENT_STATUSES = ['pending', 'picked', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned'] as const;
export type ShipmentStatus = typeof SHIPMENT_STATUSES[number];

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const PO_STATUS_COLORS: Record<PoStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  partial: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  picked: 'bg-yellow-100 text-yellow-700',
  packed: 'bg-orange-100 text-orange-700',
  dispatched: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-red-100 text-red-700',
};

export const USER_ROLES = ['admin', 'sales', 'warehouse'] as const;
export type UserRole = typeof USER_ROLES[number];

export const API_BASE = '/api/v1';
