import { z } from 'zod';

const customerTypeSchema = z.enum(['mill', 'retailer', 'other']);

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    address: z.string().max(255).optional(),
    district: z.string().max(120).optional(),
    market: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    type: customerTypeSchema.optional()
  })
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      address: z.string().max(255).optional(),
      district: z.string().max(120).optional(),
      market: z.string().max(120).optional(),
      phone: z.string().max(40).optional(),
      type: customerTypeSchema.optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required'
    })
});
// updated