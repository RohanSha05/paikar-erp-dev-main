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
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function listCustomers() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });
    });
}
function createCustomer(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.customer.create({ data: input });
    });
}
function updateCustomer(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id } });
        if (!customer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        return prisma_1.prisma.customer.update({
            where: { id },
            data: input
        });
    });
}
function deleteCustomer(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id } });
        if (!customer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        const linkedSalesOrders = yield prisma_1.prisma.salesOrder.count({
            where: { customerId: id }
        });
        if (linkedSalesOrders > 0) {
            throw new httpError_1.HttpError(409, 'Cannot delete customer because sales orders exist');
        }
        yield prisma_1.prisma.customer.delete({ where: { id } });
        return { id };
    });
}
