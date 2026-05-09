"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccountSchema = void 0;
const zod_1 = require("zod");
exports.createAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string().trim().min(1).optional(),
        name: zod_1.z.string().trim().min(1, { message: 'Account name is required' }),
        type: zod_1.z.string().trim().min(1, { message: 'Account type is required' }),
        opening: zod_1.z.coerce.number().optional().default(0),
        openingDr: zod_1.z.coerce.number().optional().default(0),
        openingCr: zod_1.z.coerce.number().optional().default(0),
        active: zod_1.z.coerce.boolean().optional().default(true),
        partyKind: zod_1.z.string().trim().min(1).optional(),
        partyRefId: zod_1.z.string().trim().min(1).optional(),
        bankInfo: zod_1.z.string().trim().optional(),
    }),
});
