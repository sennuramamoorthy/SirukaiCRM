import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit_price_cents: z.number().int().min(0),
  cost_price_cents: z.number().int().min(0),
  unit: z.string().default('unit'),
  reorder_point: z.number().int().min(0).default(0),
  reorder_quantity: z.number().int().min(0).default(0),
  location: z.string().optional().nullable(),
});

export const adjustmentSchema = z.object({
  transaction_type: z.enum(['adjustment', 'return', 'write_off']),
  quantity_change: z.number().int().refine((n) => n !== 0, 'Must be nonzero'),
  notes: z.string().optional().nullable(),
});
