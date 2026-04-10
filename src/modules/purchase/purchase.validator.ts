import { z } from 'zod';

const sellerSnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  phone: z.string().optional()
}).optional();

const destinationRefSchema = z.object({
  type: z.enum(['warehouse', 'mill']),
  id: z.string().min(1),
  name: z.string().optional()
}).nullable().optional();

const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  productType: z.string().min(1).optional(),
  id: z.string().optional(),
  bagCount: z.number().int().nonnegative(),
  actualKgPerBag: z.number().nonnegative(),
  accountingKgPerBag: z.number().nonnegative(),
  weightPolicy: z.enum(['actual', 'accounting']),
  rateBasis: z.enum(['perKg', 'perMon']),
  rateValue: z.number().nonnegative()
});

export const createPurchaseOrderDraftSchema = z.object({
  purchaseType: z.enum(['district', 'trolley', 'retail']).optional(),
  sellerId: z.string().min(1),
  sellerSnapshot: sellerSnapshotSchema,

  warehouseId: z.string().min(1),
  warehouseName: z.string().optional(),

  transport: z.number().nonnegative().default(0),
  transportMode: z.enum(['sellerIncluded', 'marketTruck', 'ownTruck']).optional(),
  loading: z.number().nonnegative().default(0),
  misc: z.number().nonnegative().default(0),

  bagCostMode: z.enum(['paid', 'self']).optional(),
  bagCostPerBag: z.number().nonnegative().default(0),
  loadingUnloading: z.number().nonnegative().default(0),

  remarks: z.string().optional(),
  varietyNote: z.string().optional(),

  destinationKind: z.enum(['warehouse', 'mill']).optional(),
  destinationWarehouseId: z.string().nullable().optional(),
  destinationCustomerId: z.string().nullable().optional(),
  destinationRef: destinationRefSchema,

  driverId: z.string().optional(),
  driverName: z.string().optional(),
  truckNo: z.string().optional(),
  route: z.string().optional(),

  items: z.array(purchaseItemSchema).min(1)
});

export const createPurchaseOrderSchema = z.object({
  body: createPurchaseOrderDraftSchema
});

export const updatePurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: createPurchaseOrderDraftSchema
});

export const getPurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const approvePurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export type CreatePurchaseOrderDraftInput = z.infer<typeof createPurchaseOrderDraftSchema>;
export type UpdatePurchaseOrderDraftInput = z.infer<typeof createPurchaseOrderDraftSchema>;
