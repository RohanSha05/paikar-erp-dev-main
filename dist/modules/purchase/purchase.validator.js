"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePurchaseOrderSchema = exports.approvePurchaseOrderSchema = exports.getPurchaseOrderSchema = exports.updatePurchaseOrderSchema = exports.createPurchaseOrderSchema = exports.createPurchaseOrderDraftSchema = void 0;
const zod_1 = require("zod");
const sellerSnapshotSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    address: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    market: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional()
}).optional().nullable();
const destinationRefSchema = zod_1.z.object({
    type: zod_1.z.enum(['warehouse', 'mill']),
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().optional()
}).nullable().optional();
const purchaseItemSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    productType: zod_1.z.string().min(1).optional(),
    productName: zod_1.z.string().min(1).optional(),
    id: zod_1.z.string().optional(),
    bagCount: zod_1.z.number().int().nonnegative(),
    actualKgPerBag: zod_1.z.number().nonnegative(),
    accountingKgPerBag: zod_1.z.number().nonnegative(),
    weightPolicy: zod_1.z.enum(['actual', 'accounting']),
    rateBasis: zod_1.z.enum(['perKg', 'perMon', 'perBag']),
    rateValue: zod_1.z.number().nonnegative()
});
exports.createPurchaseOrderDraftSchema = zod_1.z.object({
    purchaseType: zod_1.z.enum(['district', 'trolley', 'retail']).optional(),
    sellerId: zod_1.z.string().min(1),
    sellerSnapshot: sellerSnapshotSchema,
    warehouseId: zod_1.z.string().min(1),
    warehouseName: zod_1.z.string().optional(),
    transport: zod_1.z.number().nonnegative().default(0),
    transportMode: zod_1.z.enum(['sellerIncluded', 'marketTruck', 'ownTruck']).optional(),
    loading: zod_1.z.number().nonnegative().default(0),
    misc: zod_1.z.number().nonnegative().default(0),
    advancePaid: zod_1.z.number().nonnegative().optional().default(0),
    advanceInstrumentId: zod_1.z.string().optional(),
    bagCostMode: zod_1.z.enum(['paid', 'self']).optional(),
    bagCostPerBag: zod_1.z.number().nonnegative().default(0),
    loadingUnloading: zod_1.z.number().nonnegative().default(0),
    remarks: zod_1.z.string().optional(),
    varietyNote: zod_1.z.string().optional(),
    destinationKind: zod_1.z.enum(['warehouse', 'mill']).optional(),
    destinationWarehouseId: zod_1.z.string().nullable().optional(),
    destinationCustomerId: zod_1.z.string().nullable().optional(),
    destinationRef: destinationRefSchema,
    driverId: zod_1.z.string().optional(),
    driverName: zod_1.z.string().optional(),
    truckNo: zod_1.z.string().optional(),
    route: zod_1.z.string().optional(),
    items: zod_1.z.array(purchaseItemSchema).min(1)
});
exports.createPurchaseOrderSchema = zod_1.z.object({
    body: exports.createPurchaseOrderDraftSchema
});
exports.updatePurchaseOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: exports.createPurchaseOrderDraftSchema.extend({
        editPassword: zod_1.z.string().optional()
    })
});
exports.getPurchaseOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    })
});
exports.approvePurchaseOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    })
});
exports.deletePurchaseOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        editPassword: zod_1.z.string().optional()
    })
});
