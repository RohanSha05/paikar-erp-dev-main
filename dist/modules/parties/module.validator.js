"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePartySchema = exports.createPartySchema = void 0;
const zod_1 = require("zod");
exports.createPartySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120),
        district: zod_1.z.string().max(120).optional(),
        market: zod_1.z.string().max(120).optional(),
        phone: zod_1.z.string().max(40).optional(),
        nidNumber: zod_1.z.string().max(50).optional(),
        emergencyPhone: zod_1.z.string().max(40).optional(),
        address: zod_1.z.string().max(255).optional(),
    }),
});
exports.updatePartySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(2).max(120).optional(),
        district: zod_1.z.string().max(120).optional(),
        market: zod_1.z.string().max(120).optional(),
        phone: zod_1.z.string().max(40).optional(),
        nidNumber: zod_1.z.string().max(50).optional(),
        emergencyPhone: zod_1.z.string().max(40).optional(),
        address: zod_1.z.string().max(255).optional(),
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    }),
});
