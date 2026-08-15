"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const roleSchema = zod_1.z.enum(['ADMIN', 'OPERATOR', 'VIEWER']);
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(120),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(6).max(72),
        role: roleSchema.default('OPERATOR'),
        active: zod_1.z.boolean().default(true)
    })
});
exports.updateUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid()
    }),
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(2).max(120).optional(),
        password: zod_1.z.string().min(6).max(72).optional(),
        role: roleSchema.optional(),
        active: zod_1.z.boolean().optional()
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
});
