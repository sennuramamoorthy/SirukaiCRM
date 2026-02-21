import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});
