"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSalesOrderParamsSchema = exports.updateSalesOrderSchema = exports.createSalesOrderSchema = void 0;
const zod_1 = require("zod");
const salesItemSchema = zod_1.z.object({
    lotId: zod_1.z.string().min(1),
    productType: zod_1.z.string().min(1),
    productId: zod_1.z.string().min(1).optional(),
    qtyKg: zod_1.z.number().positive(),
    rateBasis: zod_1.z.enum(['perKg', 'perMon']),
    rateValue: zod_1.z.number().positive(),
    bagCount: zod_1.z.number().min(0)
});
const customerSnapshotSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1).optional(),
    district: zod_1.z.string().optional(),
    market: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional()
});
exports.createSalesOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        customerId: zod_1.z.string().min(1),
        customerSnapshot: customerSnapshotSchema.optional(),
        transport: zod_1.z.number().min(0).default(0),
        loadingUnloading: zod_1.z.number().min(0).default(0),
        misc: zod_1.z.number().min(0).default(0),
        remarks: zod_1.z.string().optional(),
        items: zod_1.z.array(salesItemSchema).min(1)
    })
});
exports.updateSalesOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z.object({
        customerId: zod_1.z.string().min(1),
        customerSnapshot: customerSnapshotSchema.optional(),
        transport: zod_1.z.number().min(0).default(0),
        loadingUnloading: zod_1.z.number().min(0).default(0),
        misc: zod_1.z.number().min(0).default(0),
        remarks: zod_1.z.string().optional(),
        items: zod_1.z.array(salesItemSchema).min(1)
    })
});
exports.confirmSalesOrderParamsSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    })
});
