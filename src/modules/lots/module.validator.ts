import { z } from 'zod';

export const listLotsSchema = z.object({
  query: z.object({
    available: z.coerce.boolean().optional()
  })
});
