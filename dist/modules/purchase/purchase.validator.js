"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePurchaseOrderSchema = exports.createPurchaseOrderSchema = void 0;
const zod_1 = require("zod");
const purchaseItemSchema = zod_1.z.object({
    lineId: zod_1.z.string().optional(),
    productId: zod_1.z.string().uuid(),
    productName: zod_1.z.string().max(120).optional(),
    bagCount: zod_1.z.number().int().positive(),
    actualKgPerBag: zod_1.z.number().positive(),
    accountingKgPerBag: zod_1.z.number().positive(),
    weightPolicy: zod_1.z.enum(['actual', 'accounting']),
    rateBasis: zod_1.z.enum(['perKg', 'perMon']),
    rateValue: zod_1.z.number().positive(),
    transportMode: zod_1.z.enum(['seller', 'self', 'none']).optional(),
    transportCost: zod_1.z.number().nonnegative().optional(),
    loadingUnloading: zod_1.z.number().nonnegative().optional(),
    misc: zod_1.z.number().nonnegative().optional(),
    destinationType: zod_1.z.enum(['Warehouse', 'Mill/Factory', 'undecided']).optional(),
    destinationRefId: zod_1.z.string().optional()
});
exports.createPurchaseOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        purchaseType: zod_1.z.enum(['district', 'trolley', 'retail']).optional(),
        sellerId: zod_1.z.string().uuid(),
        warehouseId: zod_1.z.string().uuid(),
        transport: zod_1.z.number().nonnegative().default(0),
        loading: zod_1.z.number().nonnegative().optional(),
        loadingUnloading: zod_1.z.number().nonnegative().optional(),
        misc: zod_1.z.number().nonnegative().default(0),
        bagCostMode: zod_1.z.enum(['paid', 'self']).optional(),
        bagCostPerBag: zod_1.z.number().nonnegative().default(0),
        remarks: zod_1.z.string().max(500).optional(),
        productType: zod_1.z.string().max(120).optional(),
        varietyNote: zod_1.z.string().max(200).optional(),
        destinationType: zod_1.z.enum(['Warehouse', 'Mill/Factory', 'undecided']).optional(),
        destinationRefId: zod_1.z.string().optional(),
        destinationKind: zod_1.z.enum(['warehouse', 'mill']).optional(),
        destinationWarehouseId: zod_1.z.string().uuid().optional(),
        destinationCustomerId: zod_1.z.string().uuid().optional(),
        advancePaid: zod_1.z.number().nonnegative().optional(),
        advanceInstrumentId: zod_1.z.string().optional(),
        transportMode: zod_1.z.enum(['sellerIncluded', 'marketTruck', 'ownTruck']).optional(),
        driverId: zod_1.z.string().optional(),
        driverName: zod_1.z.string().max(120).optional(),
        truckNo: zod_1.z.string().max(50).optional(),
        route: zod_1.z.string().max(200).optional(),
        driverTripId: zod_1.z.string().optional(),
        items: zod_1.z.array(purchaseItemSchema).min(1)
    })
});
exports.approvePurchaseOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    })
});
