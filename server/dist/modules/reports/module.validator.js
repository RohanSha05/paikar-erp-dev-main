"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseOrderIdParamSchema = exports.yearQuerySchema = void 0;
const zod_1 = require("zod");
exports.yearQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        year: zod_1.z.coerce.number().int().min(2000).max(2100).optional(),
    }),
});
exports.purchaseOrderIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Purchase order ID is required'),
    }),
});
