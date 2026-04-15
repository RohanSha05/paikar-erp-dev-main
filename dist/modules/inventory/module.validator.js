"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferStockSchema = exports.adjustStockSchema = void 0;
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
