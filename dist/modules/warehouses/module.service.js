"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWarehouses = listWarehouses;
exports.createWarehouse = createWarehouse;
exports.updateWarehouse = updateWarehouse;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
async function listWarehouses() {
    return prisma_1.prisma.warehouse.findMany({
        orderBy: { createdAt: 'desc' }
    });
}
async function createWarehouse(input) {
    const existing = await prisma_1.prisma.warehouse.findUnique({ where: { code: input.code } });
    if (existing) {
        throw new httpError_1.HttpError(409, 'Warehouse code already exists');
    }
    return prisma_1.prisma.warehouse.create({ data: input });
}
async function updateWarehouse(id, input) {
    const warehouse = await prisma_1.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
        throw new httpError_1.HttpError(404, 'Warehouse not found');
    }
    return prisma_1.prisma.warehouse.update({
        where: { id },
        data: input
    });
}
