import { z } from 'zod';

export const listLotsSchema = z.object({
  query: z.object({
    available: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().min(1).optional(),
    productCategory: z.string().trim().min(1).optional(),
    productName: z.string().trim().min(1).optional(),
    customerId: z.string().trim().min(1).optional(),
  })
});
