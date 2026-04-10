"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listParties = listParties;
exports.createParty = createParty;
exports.updateParty = updateParty;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
async function listParties() {
    return prisma_1.prisma.seller.findMany({
        orderBy: { createdAt: 'desc' }
    });
}
async function createParty(input) {
    return prisma_1.prisma.seller.create({ data: input });
}
async function updateParty(id, input) {
    const seller = await prisma_1.prisma.seller.findUnique({ where: { id } });
    if (!seller) {
        throw new httpError_1.HttpError(404, 'Party not found');
    }
    return prisma_1.prisma.seller.update({
        where: { id },
        data: input
    });
}
