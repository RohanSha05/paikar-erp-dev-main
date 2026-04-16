"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomerSchema = exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
const zod_1 = require("zod");
const customerTypeSchema = zod_1.z.enum(['mill', 'retailer', 'other']);
exports.createCustomerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120),
        address: zod_1.z.string().max(255).optional(),
        district: zod_1.z.string().max(120).optional(),
        market: zod_1.z.string().max(120).optional(),
        phone: zod_1.z.string().max(40).optional(),
        type: customerTypeSchema.optional()
    })
});
exports.updateCustomerSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    }),
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(2).max(120).optional(),
        address: zod_1.z.string().max(255).optional(),
        district: zod_1.z.string().max(120).optional(),
        market: zod_1.z.string().max(120).optional(),
        phone: zod_1.z.string().max(40).optional(),
        type: customerTypeSchema.optional()
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
});
exports.deleteCustomerSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    })
});
