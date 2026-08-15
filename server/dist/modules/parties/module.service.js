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
exports.listParties = listParties;
exports.createParty = createParty;
exports.updateParty = updateParty;
exports.deleteParty = deleteParty;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
function listParties() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.seller.findMany({
            orderBy: { createdAt: 'desc' }
        });
    });
}
function createParty(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const seller = yield prisma_1.prisma.seller.create({ data: input });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'seller',
            refId: seller.id,
            name: seller.name,
            type: 'party',
        });
        return seller;
    });
}
function updateParty(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existingSeller = yield prisma_1.prisma.seller.findUnique({ where: { id } });
        if (!existingSeller) {
            throw new httpError_1.HttpError(404, 'Party not found');
        }
        const updatedSeller = yield prisma_1.prisma.seller.update({
            where: { id },
            data: input
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'seller',
            refId: updatedSeller.id,
            name: updatedSeller.name,
            type: 'party',
        });
        return updatedSeller;
    });
}
function deleteParty(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const seller = yield prisma_1.prisma.seller.findUnique({ where: { id } });
        if (!seller) {
            throw new httpError_1.HttpError(404, 'Party not found');
        }
        const linkedPurchaseOrders = yield prisma_1.prisma.purchaseOrder.count({
            where: { sellerId: id }
        });
        if (linkedPurchaseOrders > 0) {
            throw new httpError_1.HttpError(409, 'Cannot delete seller because purchase orders exist');
        }
        yield prisma_1.prisma.seller.delete({ where: { id } });
        return { id };
    });
}
