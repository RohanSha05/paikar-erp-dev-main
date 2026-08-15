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
exports.listLots = listLots;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
function listLots(availableOnly) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
