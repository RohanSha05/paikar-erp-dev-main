"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postInvestorTxnSchema = exports.updateInvestorSchema = exports.createInvestorSchema = void 0;
const zod_1 = require("zod");
exports.createInvestorSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        nidNo: zod_1.z.string().optional(),
        photoUrl: zod_1.z.string().optional(),
        agreementPct: zod_1.z.number().optional(),
        notes: zod_1.z.string().optional(),
        active: zod_1.z.boolean().optional().default(true),
    }),
});
exports.updateInvestorSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'ID is required'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        nidNo: zod_1.z.string().optional(),
        photoUrl: zod_1.z.string().optional(),
        agreementPct: zod_1.z.number().optional(),
        notes: zod_1.z.string().optional(),
        active: zod_1.z.boolean().optional(),
    }),
});
exports.postInvestorTxnSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Investor ID is required'),
    }),
    body: zod_1.z.object({
        kind: zod_1.z.enum(['capitalIn', 'capitalOut', 'profitPay', 'adjustment', 'payout']),
        amount: zod_1.z.number().positive('Amount must be positive'),
        date: zod_1.z.string().optional(),
        instrument: zod_1.z.string().optional(),
        memo: zod_1.z.string().optional(),
        payAccountId: zod_1.z.string().optional().default('AC-CASH'),
    }),
});
