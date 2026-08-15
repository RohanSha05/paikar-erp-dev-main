"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDriverTripSchema = exports.createDriverTripSchema = void 0;
const zod_1 = require("zod");
exports.createDriverTripSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: zod_1.z.string().min(1).max(80).optional(),
        driverId: zod_1.z.string().min(1),
        driverName: zod_1.z.string().max(120).optional(),
        date: zod_1.z.string().min(1),
        route: zod_1.z.string().max(255).optional(),
        truckNo: zod_1.z.string().max(60).optional(),
        amount: zod_1.z.number().positive(),
        memo: zod_1.z.string().max(500).optional(),
        poId: zod_1.z.string().max(80).optional(),
        settled: zod_1.z.boolean().optional(),
        settledAt: zod_1.z.string().optional()
    })
});
exports.updateDriverTripSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1)
    }),
    body: zod_1.z
        .object({
        driverName: zod_1.z.string().max(120).optional(),
        date: zod_1.z.string().optional(),
        route: zod_1.z.string().max(255).optional(),
        truckNo: zod_1.z.string().max(60).optional(),
        amount: zod_1.z.number().positive().optional(),
        memo: zod_1.z.string().max(500).optional(),
        poId: zod_1.z.string().max(80).optional(),
        settled: zod_1.z.boolean().optional(),
        settledAt: zod_1.z.string().nullable().optional()
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
});
