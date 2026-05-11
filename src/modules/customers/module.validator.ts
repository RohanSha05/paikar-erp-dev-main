import { z } from 'zod';

const customerTypeSchema = z.enum(['mill', 'retailer', 'other']);

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    address: z.string().max(255).optional(),
    district: z.string().max(120).optional(),
    market: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    paona: z.coerce.number().optional().default(0),
    dena: z.coerce.number().optional().default(0),
    type: customerTypeSchema.optional(),
    nidNumber: z.string().max(50).optional(),
    emergencyPhone: z.string().max(40).optional()
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
      type: customerTypeSchema.optional(),
      nidNumber: z.string().max(50).optional(),
      emergencyPhone: z.string().max(40).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required'
    })
});

export const deleteCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});