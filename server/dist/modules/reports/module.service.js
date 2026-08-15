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
exports.getExpenseSummary = getExpenseSummary;
exports.getPurchaseOrderFulfillment = getPurchaseOrderFulfillment;
exports.getPurchaseOrderRemainingStock = getPurchaseOrderRemainingStock;
exports.getPurchaseOrderSoldPercent = getPurchaseOrderSoldPercent;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const module_service_1 = require("../accounting/module.service");
const KG_PER_MON = 40;
function toNumber(value) {
    return Number(value || 0);
}
function round1(value) {
    return Math.round(value * 10) / 10;
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function itemStockKg(item) {
    const bags = toNumber(item.bagCount);
    const actualKg = bags * toNumber(item.actualKgPerBag);
    const accountingKg = bags * toNumber(item.accountingKgPerBag);
    return item.weightPolicy === 'actual' ? actualKg : accountingKg;
}
function getExpenseSummary(year) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, module_service_1.getExpenseSummary)(year);
    });
}
function getPurchaseOrderFulfillment(poId) {
    return __awaiter(this, void 0, void 0, function* () {
        const po = yield prisma_1.prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: {
                items: true,
                lots: {
                    include: {
                        product: true,
                        warehouse: true,
                    },
                },
            },
        });
        if (!po) {
            throw new httpError_1.HttpError(404, 'Purchase order not found');
        }
        const itemRows = (po.items || []).map((item) => {
            const itemLots = (po.lots || []).filter((lot) => lot.sourcePoItemId === item.id);
            const initialKg = round2(itemStockKg({
                bagCount: item.bagCount,
                actualKgPerBag: item.actualKgPerBag,
                accountingKgPerBag: item.accountingKgPerBag,
                weightPolicy: item.weightPolicy,
            }));
            const remainingKg = round2(itemLots.reduce((sum, lot) => sum + toNumber(lot.availableKg), 0));
            return {
                poItemId: item.id,
                productType: item.productName || item.productId,
                initialKg,
                remainingKg,
                isSoldOut: remainingKg <= 0.00001,
                lots: itemLots.map((lot) => {
                    var _a;
                    return ({
                        id: lot.id,
                        label: lot.label,
                        warehouseId: lot.warehouseId,
                        warehouseName: ((_a = lot.warehouse) === null || _a === void 0 ? void 0 : _a.name) || lot.warehouseId,
                        remainingKg: round2(toNumber(lot.availableKg)),
                    });
                }),
            };
        });
        const remainingTotalKg = round2(itemRows.reduce((sum, row) => sum + row.remainingKg, 0));
        return {
            poId,
            isFullySold: remainingTotalKg <= 0.00001,
            remainingTotalKg,
            items: itemRows,
        };
    });
}
function getPurchaseOrderRemainingStock(poId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const po = yield prisma_1.prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: {
                lots: {
                    include: {
                        warehouse: true,
                        product: true,
                    },
                },
            },
        });
        if (!po) {
            throw new httpError_1.HttpError(404, 'Purchase order not found');
        }
        const lots = po.lots || [];
        const totalKg = lots.reduce((sum, lot) => sum + toNumber(lot.availableKg), 0);
        const byWarehouseMap = new Map();
        const byProductMap = new Map();
        for (const lot of lots) {
            const lotKg = toNumber(lot.availableKg);
            const warehouseName = ((_a = lot.warehouse) === null || _a === void 0 ? void 0 : _a.name) || lot.warehouseId;
            const productType = ((_b = lot.product) === null || _b === void 0 ? void 0 : _b.name) || lot.productId;
            const wh = byWarehouseMap.get(warehouseName) || {
                warehouse: warehouseName,
                kg: 0,
            };
            wh.kg += lotKg;
            byWarehouseMap.set(warehouseName, wh);
            const prod = byProductMap.get(productType) || {
                productType,
                kg: 0,
            };
            prod.kg += lotKg;
            byProductMap.set(productType, prod);
        }
        const fulfillment = yield getPurchaseOrderFulfillment(poId);
        return {
            totalKg: round2(totalKg),
            totalMon: round2(totalKg / KG_PER_MON),
            lots: lots.map((lot) => {
                var _a, _b, _c;
                return ({
                    id: lot.id,
                    lotNo: lot.lotNo,
                    label: lot.label,
                    warehouseId: lot.warehouseId,
                    warehouseName: ((_a = lot.warehouse) === null || _a === void 0 ? void 0 : _a.name) || lot.warehouseId,
                    productId: lot.productId,
                    productName: ((_b = lot.product) === null || _b === void 0 ? void 0 : _b.name) || lot.productId,
                    productType: ((_c = lot.product) === null || _c === void 0 ? void 0 : _c.name) || lot.productId,
                    remainingKg: round2(toNumber(lot.availableKg)),
                });
            }),
            byWarehouse: Array.from(byWarehouseMap.values())
                .map((x) => (Object.assign(Object.assign({}, x), { kg: round2(x.kg) })))
                .sort((a, b) => b.kg - a.kg),
            byProduct: Array.from(byProductMap.values())
                .map((x) => (Object.assign(Object.assign({}, x), { kg: round2(x.kg) })))
                .sort((a, b) => b.kg - a.kg),
            poId,
            isFullySold: totalKg <= 0.00001,
            remainingTotalKg: fulfillment.remainingTotalKg,
            items: fulfillment.items,
        };
    });
}
function getPurchaseOrderSoldPercent(poId) {
    return __awaiter(this, void 0, void 0, function* () {
        const fulfillment = yield getPurchaseOrderFulfillment(poId);
        let initialKg = fulfillment.items.reduce((sum, item) => sum + item.initialKg, 0);
        if (initialKg <= 0) {
            const purchaseMoves = yield prisma_1.prisma.stockMove.aggregate({
                where: {
                    reason: client_1.StockMoveReason.PURCHASE,
                    refType: client_1.StockRefType.PO,
                    refId: poId,
                },
                _sum: {
                    qtyKg: true,
                },
            });
            initialKg = toNumber(purchaseMoves._sum.qtyKg);
        }
        const remainingKg = fulfillment.remainingTotalKg;
        const soldKg = Math.max(0, initialKg - remainingKg);
        const soldPct = initialKg > 0 ? (soldKg / initialKg) * 100 : 0;
        return {
            initialKg: round2(initialKg),
            soldKg: round2(soldKg),
            remainingKg: round2(remainingKg),
            soldPct: round1(soldPct),
            isFullySold: remainingKg <= 0.00001,
            poId,
        };
    });
}
