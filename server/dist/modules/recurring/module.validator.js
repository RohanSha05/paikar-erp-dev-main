"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRecurringTemplateSchema = exports.recurringTemplateSchema = void 0;
const zod_1 = require("zod");
exports.recurringTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1, { message: 'Template name is required' }),
        expenseAccountId: zod_1.z.string().trim().min(1),
        payFromAccountId: zod_1.z.string().trim().min(1).optional(),
        amount: zod_1.z.coerce.number().positive({ message: 'Amount must be greater than 0' }),
        frequency: zod_1.z.enum(['monthly', 'daily']),
        dayOfMonth: zod_1.z.coerce.number().int().min(1).max(31).optional(),
        active: zod_1.z.coerce.boolean().optional().default(true),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updateRecurringTemplateSchema = zod_1.z.object({
    body: exports.recurringTemplateSchema.shape.body.partial(),
});
