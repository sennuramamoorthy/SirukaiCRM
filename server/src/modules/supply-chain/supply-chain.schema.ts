import { z } from 'zod';

export const supplierSchema = z.object({
  name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const poItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity_ordered: z.number().int().positive(),
  unit_cost_cents: z.number().int().min(0),
});

export const createPoSchema = z.object({
  supplier_id: z.number().int().positive(),
  expected_date: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export const updatePoSchema = z.object({
  expected_date: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const poStatusSchema = z.object({
  status: z.enum(['sent', 'confirmed', 'cancelled']),
});

export const receiveItemSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    quantity_received: z.number().int().min(0),
  })).min(1),
});

export const shipmentSchema = z.object({
  order_id: z.number().int().positive(),
  carrier: z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
  estimated_delivery: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const shipmentStatusSchema = z.object({
  status: z.enum(['picked', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned']),
  carrier: z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
  actual_delivery: z.number().int().optional().nullable(),
});

export const supplierProductSchema = z.object({
  product_id: z.number().int().positive(),
  supplier_sku: z.string().optional().nullable(),
  cost_price_cents: z.number().int().min(0).default(0),
  lead_time_days: z.number().int().min(0).default(0),
  min_order_quantity: z.number().int().min(1).default(1),
  is_preferred: z.boolean().default(false),
});
