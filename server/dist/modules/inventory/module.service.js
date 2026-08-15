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
exports.adjustStock = adjustStock;
exports.transferStock = transferStock;
exports.getInventoryDashboard = getInventoryDashboard;
exports.getStockCard = getStockCard;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const sequence_id_1 = require("../../common/utils/sequence-id");
function moveNo(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.stockMove, 'moveNo', 'MV');
    });
}
function transferRef(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.stockMove, 'refId', 'TRF');
    });
}
function adjustmentRef(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.stockMove, 'refId', 'ADJ');
    });
}
function transferLotNo(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.lot, 'lotNo', 'LOT-TRF');
    });
}
function transferLotLabel(lotNoValue, productId, warehouseId) {
    return `${lotNoValue}-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}`;
}
function ensureSystemAccountByCode(tx_1, code_1, name_1) {
    return __awaiter(this, arguments, void 0, function* (tx, code, name, type = 'asset') {
        return tx.account.upsert({
            where: { code },
            update: {},
            create: {
                code,
                name,
                type,
                opening: new client_1.Prisma.Decimal(0),
                active: true,
            },
        });
    });
}
function generateVoucherNo(tx, vdate) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH', vdate);
    });
}
function createInventoryVoucher(tx, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const voucherNo = yield generateVoucherNo(tx, input.vdate);
        const voucher = yield tx.voucher.create({
            data: {
                voucherNo,
                vtype: 'journal',
                vdate: input.vdate,
                narration: input.narration,
            },
        });
        yield tx.voucherRow.createMany({
            data: input.rows.map((row) => ({
                voucherId: voucher.id,
                accountId: row.accountId,
                dr: new client_1.Prisma.Decimal(row.dr || 0),
                cr: new client_1.Prisma.Decimal(row.cr || 0),
                memo: row.memo,
            })),
        });
        return voucher;
    });
}
function adjustStock(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const lot = yield tx.lot.findUnique({ where: { id: input.lotId } });
            if (!lot)
                throw new httpError_1.HttpError(404, 'Lot not found');
            const delta = input.mode === 'add' ? input.qtyKg : -input.qtyKg;
            const nextQty = Number(lot.availableKg) + delta;
            if (nextQty < 0) {
                throw new httpError_1.HttpError(409, `Insufficient stock in lot ${lot.label}`);
            }
            const updatedLot = yield tx.lot.update({
                where: { id: lot.id },
                data: {
                    availableKg: new client_1.Prisma.Decimal(nextQty)
                }
            });
            const move = yield tx.stockMove.create({
                data: {
                    moveNo: yield moveNo(tx),
                    lotId: lot.id,
                    warehouseId: lot.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(delta),
                    reason: 'ADJUSTMENT',
                    refType: 'ADJ',
                    refId: yield adjustmentRef(tx),
                    memo: input.reason,
                    lotLabel: lot.label
                }
            });
            const absQty = Math.abs(delta);
            const adjustmentValue = absQty * Number(lot.avgCostPerKg || 0);
            let voucher = null;
            if (adjustmentValue > 0) {
                const inventoryAccount = yield ensureSystemAccountByCode(tx, 'AC-INVENTORY', 'Inventory', 'asset');
                const adjustmentAccount = yield ensureSystemAccountByCode(tx, 'AC-INVENTORY-ADJ', 'Inventory Adjustment', 'expense');
                const rows = input.mode === 'add'
                    ? [
                        { accountId: inventoryAccount.id, dr: adjustmentValue, cr: 0, memo: input.reason || 'Stock adjustment increase' },
                        { accountId: adjustmentAccount.id, dr: 0, cr: adjustmentValue, memo: input.reason || 'Stock adjustment offset' },
                    ]
                    : [
                        { accountId: adjustmentAccount.id, dr: adjustmentValue, cr: 0, memo: input.reason || 'Stock adjustment expense' },
                        { accountId: inventoryAccount.id, dr: 0, cr: adjustmentValue, memo: input.reason || 'Stock adjustment decrease' },
                    ];
                const voucherDate = new Date();
                voucher = yield createInventoryVoucher(tx, {
                    vdate: voucherDate,
                    narration: `Inventory adjustment ${input.mode} - ${lot.label}`,
                    rows,
                });
            }
            return {
                lot: updatedLot,
                move,
                voucher
            };
        }));
    });
}
function transferStock(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const sourceLot = yield tx.lot.findUnique({ where: { id: input.lotId } });
            if (!sourceLot)
                throw new httpError_1.HttpError(404, 'Source lot not found');
            if (sourceLot.warehouseId === input.toWarehouseId) {
                throw new httpError_1.HttpError(400, 'Source and destination warehouse must be different');
            }
            const toWarehouse = yield tx.warehouse.findUnique({ where: { id: input.toWarehouseId } });
            if (!toWarehouse)
                throw new httpError_1.HttpError(404, 'Destination warehouse not found');
            if (Number(sourceLot.availableKg) < input.qtyKg) {
                throw new httpError_1.HttpError(409, `Insufficient stock in lot ${sourceLot.label}`);
            }
            const nextSourceQty = Number(sourceLot.availableKg) - input.qtyKg;
            const updatedSourceLot = yield tx.lot.update({
                where: { id: sourceLot.id },
                data: {
                    availableKg: new client_1.Prisma.Decimal(nextSourceQty)
                }
            });
            let destinationLot = yield tx.lot.findFirst({
                where: {
                    productId: sourceLot.productId,
                    warehouseId: input.toWarehouseId
                },
                orderBy: { createdAt: 'desc' }
            });
            if (!destinationLot) {
                const nextLotNo = yield transferLotNo(tx);
                destinationLot = yield tx.lot.create({
                    data: {
                        lotNo: nextLotNo,
                        label: transferLotLabel(nextLotNo, sourceLot.productId, input.toWarehouseId),
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
            const updatedDestinationLot = yield tx.lot.update({
                where: { id: destinationLot.id },
                data: {
                    availableKg: new client_1.Prisma.Decimal(dstNextQty),
                    avgCostPerKg: new client_1.Prisma.Decimal(dstNextAvg)
                }
            });
            const refId = yield transferRef(tx);
            const outMove = yield tx.stockMove.create({
                data: {
                    moveNo: yield moveNo(tx),
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
            const inMove = yield tx.stockMove.create({
                data: {
                    moveNo: yield moveNo(tx),
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
            const transferValue = input.qtyKg * Number(sourceLot.avgCostPerKg || 0);
            let voucher = null;
            if (transferValue > 0) {
                const inventoryAccount = yield ensureSystemAccountByCode(tx, 'AC-INVENTORY', 'Inventory', 'asset');
                const transferClearingAccount = yield ensureSystemAccountByCode(tx, 'AC-INVENTORY-TRF', 'Inventory Transfer Clearing', 'asset');
                const voucherDate = new Date();
                voucher = yield createInventoryVoucher(tx, {
                    vdate: voucherDate,
                    narration: `Inventory transfer ${sourceLot.label} -> ${updatedDestinationLot.label}`,
                    rows: [
                        {
                            accountId: inventoryAccount.id,
                            dr: transferValue,
                            cr: 0,
                            memo: input.memo || `Transfer in to ${toWarehouse.name}`,
                        },
                        {
                            accountId: transferClearingAccount.id,
                            dr: 0,
                            cr: transferValue,
                            memo: input.memo || `Transfer out from source warehouse`,
                        },
                    ],
                });
            }
            return {
                sourceLot: updatedSourceLot,
                destinationLot: updatedDestinationLot,
                moves: [outMove, inMove],
                voucher
            };
        }));
    });
}
function dateStart(dateText) {
    return new Date(`${dateText}T00:00:00.000Z`);
}
function dateEnd(dateText) {
    return new Date(`${dateText}T23:59:59.999Z`);
}
function toNumber(v) {
    return Number(v || 0);
}
function getInventoryDashboard(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = Math.max(1, query.page || 1);
        const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
        const skip = (page - 1) * pageSize;
        const where = {
            AND: [
                query.availableOnly ? { availableKg: { gt: new client_1.Prisma.Decimal(0) } } : {},
                query.warehouseId ? { warehouseId: query.warehouseId } : {},
                query.productId ? { productId: query.productId } : {},
                query.q
                    ? {
                        OR: [
                            { label: { contains: query.q, mode: 'insensitive' } },
                            { product: { name: { contains: query.q, mode: 'insensitive' } } },
                            { warehouse: { name: { contains: query.q, mode: 'insensitive' } } }
                        ]
                    }
                    : {}
            ]
        };
        const sortBy = query.sortBy || 'createdAt';
        const sortDir = query.sortDir || 'desc';
        const [total, pageLots, aggregate, valueRows, grouped] = yield Promise.all([
            prisma_1.prisma.lot.count({ where }),
            prisma_1.prisma.lot.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { [sortBy]: sortDir },
                include: {
                    product: { select: { id: true, name: true } },
                    warehouse: { select: { id: true, name: true } }
                }
            }),
            prisma_1.prisma.lot.aggregate({
                where,
                _count: { _all: true },
                _sum: { availableKg: true }
            }),
            prisma_1.prisma.lot.findMany({
                where,
                select: { availableKg: true, avgCostPerKg: true }
            }),
            prisma_1.prisma.lot.groupBy({
                by: ['productId'],
                where,
                _sum: { availableKg: true },
                _count: { _all: true },
                orderBy: { _sum: { availableKg: 'desc' } },
                take: 20
            })
        ]);
        const totalQtyKg = toNumber(aggregate._sum.availableKg);
        const totalValue = valueRows.reduce((sum, row) => sum + toNumber(row.availableKg) * toNumber(row.avgCostPerKg), 0);
        const productIds = grouped.map((g) => g.productId);
        const productRows = productIds.length
            ? yield prisma_1.prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true }
            })
            : [];
        const productNameById = Object.fromEntries(productRows.map((p) => [p.id, p.name]));
        return {
            summary: {
                totalLots: aggregate._count._all,
                totalQtyKg,
                totalValue
            },
            breakdownByProduct: grouped.map((g) => ({
                productId: g.productId,
                productName: productNameById[g.productId] || g.productId,
                lotCount: g._count._all,
                qtyKg: toNumber(g._sum.availableKg)
            })),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            },
            items: pageLots.map((lot) => {
                var _a, _b;
                return ({
                    id: lot.id,
                    lotNo: lot.lotNo,
                    label: lot.label,
                    productId: lot.productId,
                    productName: ((_a = lot.product) === null || _a === void 0 ? void 0 : _a.name) || '',
                    warehouseId: lot.warehouseId,
                    warehouseName: ((_b = lot.warehouse) === null || _b === void 0 ? void 0 : _b.name) || '',
                    availableKg: toNumber(lot.availableKg),
                    avgCostPerKg: toNumber(lot.avgCostPerKg),
                    value: toNumber(lot.availableKg) * toNumber(lot.avgCostPerKg),
                    createdAt: lot.createdAt,
                    updatedAt: lot.updatedAt
                });
            })
        };
    });
}
function getStockCard(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = Math.max(1, query.page || 1);
        const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
        const skip = (page - 1) * pageSize;
        const fromDate = query.from ? dateStart(query.from) : undefined;
        const toDate = query.to ? dateEnd(query.to) : undefined;
        const baseWhere = {
            AND: [
                query.lotId ? { lotId: query.lotId } : {},
                query.warehouseId ? { warehouseId: query.warehouseId } : {}
            ]
        };
        const inRangeWhere = {
            AND: [
                baseWhere,
                fromDate ? { createdAt: { gte: fromDate } } : {},
                toDate ? { createdAt: { lte: toDate } } : {}
            ]
        };
        const openingWhere = fromDate
            ? {
                AND: [baseWhere, { createdAt: { lt: fromDate } }]
            }
            : { AND: [baseWhere] };
        const [total, rows, openingAgg, inAgg] = yield Promise.all([
            prisma_1.prisma.stockMove.count({ where: inRangeWhere }),
            prisma_1.prisma.stockMove.findMany({
                where: inRangeWhere,
                skip,
                take: pageSize,
                orderBy: [{ createdAt: query.sortDir || 'asc' }, { id: query.sortDir || 'asc' }],
                include: {
                    warehouse: { select: { id: true, name: true } },
                    lot: { select: { id: true, label: true, productId: true } }
                }
            }),
            prisma_1.prisma.stockMove.aggregate({ where: openingWhere, _sum: { qtyKg: true } }),
            prisma_1.prisma.stockMove.aggregate({ where: inRangeWhere, _sum: { qtyKg: true } })
        ]);
        const inSummary = yield prisma_1.prisma.stockMove.groupBy({
            by: ['reason'],
            where: inRangeWhere,
            _sum: { qtyKg: true }
        });
        const totalInKg = inSummary
            .filter((x) => toNumber(x._sum.qtyKg) > 0)
            .reduce((s, x) => s + toNumber(x._sum.qtyKg), 0);
        const totalOutKg = inSummary
            .filter((x) => toNumber(x._sum.qtyKg) < 0)
            .reduce((s, x) => s + Math.abs(toNumber(x._sum.qtyKg)), 0);
        const openingQtyKg = toNumber(openingAgg._sum.qtyKg);
        const netMovementKg = toNumber(inAgg._sum.qtyKg);
        const closingQtyKg = openingQtyKg + netMovementKg;
        return {
            filters: {
                lotId: query.lotId || null,
                warehouseId: query.warehouseId || null,
                from: query.from || null,
                to: query.to || null,
                sortDir: query.sortDir || 'asc'
            },
            summary: {
                openingQtyKg,
                totalInKg,
                totalOutKg,
                netMovementKg,
                closingQtyKg
            },
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            },
            items: rows.map((m) => {
                var _a, _b;
                return ({
                    id: m.id,
                    moveNo: m.moveNo,
                    createdAt: m.createdAt,
                    reason: m.reason,
                    refType: m.refType,
                    refId: m.refId,
                    memo: m.memo,
                    qtyKg: toNumber(m.qtyKg),
                    lotId: m.lotId,
                    lotLabel: m.lotLabel || ((_a = m.lot) === null || _a === void 0 ? void 0 : _a.label) || '',
                    warehouseId: m.warehouseId,
                    warehouseName: ((_b = m.warehouse) === null || _b === void 0 ? void 0 : _b.name) || ''
                });
            })
        };
    });
}
