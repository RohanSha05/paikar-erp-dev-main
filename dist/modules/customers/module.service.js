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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
function listCustomers() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });
    });
}
function createCustomer(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { paona, dena } = input, customerData = __rest(input, ["paona", "dena"]);
        const customer = yield prisma_1.prisma.customer.create({
            data: {
                name: customerData.name,
                district: customerData.district,
                market: customerData.market,
                phone: customerData.phone,
                address: customerData.address,
                type: customerData.type || 'other',
                nidNumber: customerData.nidNumber,
                emergencyPhone: customerData.emergencyPhone,
            },
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'customer',
            refId: customer.id,
            name: customer.name,
            type: 'party',
            openingDr: paona,
            openingCr: dena,
        });
        return customer;
    });
}
function updateCustomer(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const existingCustomer = yield prisma_1.prisma.customer.findUnique({ where: { id } });
        if (!existingCustomer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        const updatedCustomer = yield prisma_1.prisma.customer.update({
            where: { id },
            data: {
                name: (_a = input.name) !== null && _a !== void 0 ? _a : existingCustomer.name,
                district: (_b = input.district) !== null && _b !== void 0 ? _b : existingCustomer.district,
                market: (_c = input.market) !== null && _c !== void 0 ? _c : existingCustomer.market,
                phone: (_d = input.phone) !== null && _d !== void 0 ? _d : existingCustomer.phone,
                address: (_e = input.address) !== null && _e !== void 0 ? _e : existingCustomer.address,
                type: (_f = input.type) !== null && _f !== void 0 ? _f : existingCustomer.type,
                nidNumber: (_g = input.nidNumber) !== null && _g !== void 0 ? _g : existingCustomer.nidNumber,
                emergencyPhone: (_h = input.emergencyPhone) !== null && _h !== void 0 ? _h : existingCustomer.emergencyPhone,
            },
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'customer',
            refId: updatedCustomer.id,
            name: updatedCustomer.name,
            type: 'party',
        });
        return updatedCustomer;
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
