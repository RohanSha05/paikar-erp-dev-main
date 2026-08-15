import { z } from 'zod';

const salesItemSchema = z.object({
  lotId: z.string().uuid(),
  productType: z.string().min(1),
  productId: z.string().uuid().optional(),
  qtyKg: z.number().positive(),
  rateBasis: z.enum(['perKg', 'perMon']),
  rateValue: z.number().positive()
});

const customerSnapshotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional()
});

export const createSalesOrderSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    customerSnapshot: customerSnapshotSchema.optional(),
    transport: z.number().min(0).default(0),
    loadingUnloading: z.number().min(0).default(0),
    misc: z.number().min(0).default(0),
    remarks: z.string().optional(),
    items: z.array(salesItemSchema).min(1)
  })
});

export const updateSalesOrderSchema = createSalesOrderSchema;

export const confirmSalesOrderParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>['body'];
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>['body'];