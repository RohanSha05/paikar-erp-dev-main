"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
async function listProducts() {
    return prisma_1.prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
    });
}
async function createProduct(data) {
    const existing = await prisma_1.prisma.product.findUnique({
        where: { code: data.code }
    });
    if (existing) {
        throw new httpError_1.HttpError(409, 'Product code already exists');
    }
    return prisma_1.prisma.product.create({ data });
}
async function updateProduct(id, data) {
    const exists = await prisma_1.prisma.product.findUnique({ where: { id } });
    if (!exists) {
        throw new httpError_1.HttpError(404, 'Product not found');
    }
    return prisma_1.prisma.product.update({
        where: { id },
        data
    });
}
