"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDriverSchema = exports.createDriverSchema = void 0;
const zod_1 = require("zod");
exports.createDriverSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: zod_1.z.string().min(1).max(80).optional(),
        name: zod_1.z.string().min(2).max(120),
        phone: zod_1.z.string().max(40).optional(),
        truckNo: zod_1.z.string().max(60).optional(),
        licenseNo: zod_1.z.string().max(80).optional(),
        active: zod_1.z.boolean().default(true)
    })
});
exports.updateDriverSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(2).max(120).optional(),
        phone: zod_1.z.string().max(40).optional(),
        truckNo: zod_1.z.string().max(60).optional(),
        licenseNo: zod_1.z.string().max(80).optional(),
        active: zod_1.z.boolean().optional()
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
});
