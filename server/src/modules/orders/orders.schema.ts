import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().min(0),
  discount_pct: z.number().min(0).max(100).default(0),
});

export const createOrderSchema = z.object({
  customer_id: z.number().int().positive(),
  shipping_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discount_cents: z.number().int().min(0).default(0),
  tax_cents: z.number().int().min(0).default(0),
  items: z.array(orderItemSchema).min(1),
});

export const updateOrderSchema = z.object({
  shipping_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  discount_cents: z.number().int().min(0).optional(),
  tax_cents: z.number().int().min(0).optional(),
});

export const statusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export const addItemSchema = orderItemSchema;
