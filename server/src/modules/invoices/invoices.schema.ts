import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  amount_paid_cents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});
