"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStock = adjustStock;
exports.transferStock = transferStock;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function moveNo() {
    return `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function transferRef() {
    return `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function adjustmentRef() {
    return `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function transferLotNo() {
    return `LOT-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function transferLotLabel(productId, warehouseId) {
    return `LOT-TRF-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}-${Date.now()}`;
}
async function adjustStock(input) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const lot = await tx.lot.findUnique({ where: { id: input.lotId } });
        if (!lot)
            throw new httpError_1.HttpError(404, 'Lot not found');
        const delta = input.mode === 'add' ? input.qtyKg : -input.qtyKg;
        const nextQty = Number(lot.availableKg) + delta;
        if (nextQty < 0) {
            throw new httpError_1.HttpError(409, `Insufficient stock in lot ${lot.label}`);
        }
        const updatedLot = await tx.lot.update({
            where: { id: lot.id },
            data: {
                availableKg: new client_1.Prisma.Decimal(nextQty)
            }
        });
        const move = await tx.stockMove.create({
            data: {
                moveNo: moveNo(),
                lotId: lot.id,
                warehouseId: lot.warehouseId,
                qtyKg: new client_1.Prisma.Decimal(delta),
                reason: 'ADJUSTMENT',
                refType: 'ADJ',
                refId: adjustmentRef(),
                memo: input.reason,
                lotLabel: lot.label
            }
        });
        return {
            lot: updatedLot,
            move
        };
    });
}
async function transferStock(input) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const sourceLot = await tx.lot.findUnique({ where: { id: input.lotId } });
        if (!sourceLot)
            throw new httpError_1.HttpError(404, 'Source lot not found');
        if (sourceLot.warehouseId === input.toWarehouseId) {
            throw new httpError_1.HttpError(400, 'Source and destination warehouse must be different');
        }
        const toWarehouse = await tx.warehouse.findUnique({ where: { id: input.toWarehouseId } });
        if (!toWarehouse)
            throw new httpError_1.HttpError(404, 'Destination warehouse not found');
        if (Number(sourceLot.availableKg) < input.qtyKg) {
            throw new httpError_1.HttpError(409, `Insufficient stock in lot ${sourceLot.label}`);
        }
        const nextSourceQty = Number(sourceLot.availableKg) - input.qtyKg;
        const updatedSourceLot = await tx.lot.update({
            where: { id: sourceLot.id },
            data: {
                availableKg: new client_1.Prisma.Decimal(nextSourceQty)
            }
        });
        let destinationLot = await tx.lot.findFirst({
            where: {
                productId: sourceLot.productId,
                warehouseId: input.toWarehouseId
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!destinationLot) {
            destinationLot = await tx.lot.create({
                data: {
                    lotNo: transferLotNo(),
                    label: transferLotLabel(sourceLot.productId, input.toWarehouseId),
                    productId: sourceLot.productId,
                    warehouseId: input.toWarehouseId,
                    availableKg: new client_1.Prisma.Decimal(0),
                    avgCostPerKg: sourceLot.avgCostPerKg,
                    sourcePoId: sourceLot.sourcePoId,
                    sourcePoItemId: sourceLot.sourcePoItemId
                }
            });
        }
        const dstCurrentQty = Number(destinationLot.availableKg);
        const srcAvg = Number(sourceLot.avgCostPerKg);
        const dstAvg = Number(destinationLot.avgCostPerKg);
        const dstNextQty = dstCurrentQty + input.qtyKg;
        const dstNextAvg = dstNextQty > 0
            ? (dstCurrentQty * dstAvg + input.qtyKg * srcAvg) / dstNextQty
            : dstAvg;
        const updatedDestinationLot = await tx.lot.update({
            where: { id: destinationLot.id },
            data: {
                availableKg: new client_1.Prisma.Decimal(dstNextQty),
                avgCostPerKg: new client_1.Prisma.Decimal(dstNextAvg)
            }
        });
        const refId = transferRef();
        const outMove = await tx.stockMove.create({
            data: {
                moveNo: moveNo(),
                lotId: sourceLot.id,
                warehouseId: sourceLot.warehouseId,
                qtyKg: new client_1.Prisma.Decimal(-input.qtyKg),
                reason: 'TRANSFER',
                refType: 'TRF',
                refId,
                memo: input.memo,
                lotLabel: sourceLot.label
            }
        });
        const inMove = await tx.stockMove.create({
            data: {
                moveNo: moveNo(),
                lotId: updatedDestinationLot.id,
                warehouseId: input.toWarehouseId,
                qtyKg: new client_1.Prisma.Decimal(input.qtyKg),
                reason: 'TRANSFER',
                refType: 'TRF',
                refId,
                memo: input.memo,
                lotLabel: updatedDestinationLot.label
            }
        });
        return {
            sourceLot: updatedSourceLot,
            destinationLot: updatedDestinationLot,
            moves: [outMove, inMove]
        };
    });
}
