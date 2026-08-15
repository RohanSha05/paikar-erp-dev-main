import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(30),
    name: z.string().min(2).max(120),
    category: z.string().max(80).optional(),
    unit: z.enum(['kg', 'mon', 'bag']).default('bag'),
    active: z.boolean().default(true)
  })
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    category: z.string().max(80).optional(),
    unit: z.enum(['kg', 'mon', 'bag']).optional(),
    active: z.boolean().optional()
  })
});
