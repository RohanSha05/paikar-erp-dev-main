import { z } from 'zod';

export const createPartySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    district: z.string().max(120).optional(),
    market: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),

    nidNumber: z.string().max(50).optional(),
    emergencyPhone: z.string().max(40).optional(),
    address: z.string().max(255).optional(),
  }),
});

export const updatePartySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      district: z.string().max(120).optional(),
      market: z.string().max(120).optional(),
      phone: z.string().max(40).optional(),

      nidNumber: z.string().max(50).optional(),
      emergencyPhone: z.string().max(40).optional(),
      address: z.string().max(255).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});
