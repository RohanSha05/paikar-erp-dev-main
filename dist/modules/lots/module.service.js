"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLots = listLots;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
async function listLots(availableOnly) {
    return prisma_1.prisma.lot.findMany({
        where: availableOnly ? { availableKg: { gt: new client_1.Prisma.Decimal(0) } } : undefined,
        include: {
            product: true,
            warehouse: true,
            sourcePo: true,
            stockMoves: {
                orderBy: { createdAt: 'desc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}
