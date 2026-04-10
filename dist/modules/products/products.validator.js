"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(30),
        name: zod_1.z.string().min(2).max(120),
        category: zod_1.z.string().max(80).optional(),
        unit: zod_1.z.enum(['kg', 'mon', 'bag']).default('bag'),
        active: zod_1.z.boolean().default(true)
    })
});
exports.updateProductSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120).optional(),
        category: zod_1.z.string().max(80).optional(),
        unit: zod_1.z.enum(['kg', 'mon', 'bag']).optional(),
        active: zod_1.z.boolean().optional()
    })
});
