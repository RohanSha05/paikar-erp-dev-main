"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWarehouseSchema = exports.createWarehouseSchema = void 0;
const zod_1 = require("zod");
exports.createWarehouseSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().min(2).max(30),
        name: zod_1.z.string().min(2).max(120),
        address: zod_1.z.string().max(255).optional()
    })
});
exports.updateWarehouseSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    }),
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(2).max(120).optional(),
        address: zod_1.z.string().max(255).optional()
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
});
