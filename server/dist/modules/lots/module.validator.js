"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLotsSchema = void 0;
const zod_1 = require("zod");
exports.listLotsSchema = zod_1.z.object({
    query: zod_1.z.object({
        available: zod_1.z.coerce.boolean().optional()
    })
});
