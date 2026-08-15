"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockCardQuerySchema = exports.inventoryDashboardSchema = exports.transferStockSchema = exports.adjustStockSchema = void 0;
const zod_1 = require("zod");
exports.adjustStockSchema = zod_1.z.object({
    body: zod_1.z.object({
        lotId: zod_1.z.string().uuid(),
        mode: zod_1.z.enum(['add', 'remove']),
        qtyKg: zod_1.z.number().positive(),
        reason: zod_1.z.string().max(255).optional()
    })
});
exports.transferStockSchema = zod_1.z.object({
    body: zod_1.z.object({
        lotId: zod_1.z.string().uuid(),
        toWarehouseId: zod_1.z.string().uuid(),
        qtyKg: zod_1.z.number().positive(),
        memo: zod_1.z.string().max(255).optional()
    })
});
exports.inventoryDashboardSchema = zod_1.z.object({
    query: zod_1.z.object({
        q: zod_1.z.string().trim().max(100).optional(),
        warehouseId: zod_1.z.string().uuid().optional(),
        productId: zod_1.z.string().uuid().optional(),
        availableOnly: zod_1.z.coerce.boolean().optional().default(false),
        page: zod_1.z.coerce.number().int().min(1).optional().default(1),
        pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
        sortBy: zod_1.z.enum(['createdAt', 'availableKg', 'avgCostPerKg']).optional().default('createdAt'),
        sortDir: zod_1.z.enum(['asc', 'desc']).optional().default('desc')
    })
});
const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
exports.stockCardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        lotId: zod_1.z.string().uuid().optional(),
        warehouseId: zod_1.z.string().uuid().optional(),
        from: zod_1.z.string().regex(isoDateOnly, 'from must be YYYY-MM-DD').optional(),
        to: zod_1.z.string().regex(isoDateOnly, 'to must be YYYY-MM-DD').optional(),
        page: zod_1.z.coerce.number().int().min(1).optional().default(1),
        pageSize: zod_1.z.coerce.number().int().min(1).max(200).optional().default(50),
        sortDir: zod_1.z.enum(['asc', 'desc']).optional().default('asc')
    })
});
