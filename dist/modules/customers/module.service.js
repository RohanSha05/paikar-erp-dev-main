"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
async function listCustomers() {
    return prisma_1.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' }
    });
}
async function createCustomer(input) {
    return prisma_1.prisma.customer.create({ data: input });
}
async function updateCustomer(id, input) {
    const customer = await prisma_1.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
        throw new httpError_1.HttpError(404, 'Customer not found');
    }
    return prisma_1.prisma.customer.update({
        where: { id },
        data: input
    });
}
