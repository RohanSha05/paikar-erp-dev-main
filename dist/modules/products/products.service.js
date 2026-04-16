"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function listProducts() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });
    });
}
function createProduct(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.product.findUnique({
            where: { code: data.code }
        });
        if (existing) {
            throw new httpError_1.HttpError(409, 'Product code already exists');
        }
        return prisma_1.prisma.product.create({ data });
    });
}
function updateProduct(id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const exists = yield prisma_1.prisma.product.findUnique({ where: { id } });
        if (!exists) {
            throw new httpError_1.HttpError(404, 'Product not found');
        }
        return prisma_1.prisma.product.update({
            where: { id },
            data
        });
    });
}
