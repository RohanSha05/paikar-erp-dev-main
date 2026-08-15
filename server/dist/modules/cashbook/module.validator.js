"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoucherSchema = exports.createPartySchema = exports.voucherRowSchema = void 0;
const zod_1 = require("zod");
exports.voucherRowSchema = zod_1.z.object({
    accountId: zod_1.z.string().trim().min(1, { message: 'Invalid account ID' }),
    dr: zod_1.z.number().nonnegative().optional().default(0),
    cr: zod_1.z.number().nonnegative().optional().default(0),
    memo: zod_1.z.string().optional(),
});
exports.createPartySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, { message: 'Party name is required' }),
        type: zod_1.z.enum(['seller', 'customer', 'mill', 'driver', 'investor', 'employee', 'other']),
    }),
});
exports.createVoucherSchema = zod_1.z.object({
    body: zod_1.z.object({
        vtype: zod_1.z.enum(['payment', 'receipt', 'journal', 'contra'], {
            message: 'Invalid voucher type',
        }),
        vdate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
            message: 'Date must be in YYYY-MM-DD format',
        }),
        rows: zod_1.z.array(exports.voucherRowSchema).min(2, {
            message: 'A voucher must have at least 2 rows (debit and credit)',
        }),
        narration: zod_1.z.string().optional(),
    }).refine((data) => {
        const totalDr = data.rows.reduce((sum, row) => sum + (row.dr || 0), 0);
        const totalCr = data.rows.reduce((sum, row) => sum + (row.cr || 0), 0);
        const diff = Math.abs(totalDr - totalCr);
        return diff < 0.01; // Allow for floating point rounding
    }, {
        message: 'Total debits must equal total credits',
        path: ['rows'],
    }),
});
