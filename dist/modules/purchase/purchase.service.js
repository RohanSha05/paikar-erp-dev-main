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
exports.listPurchaseOrders = listPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.createDraft = createDraft;
exports.updatePurchaseOrderDraft = updatePurchaseOrderDraft;
exports.approvePurchaseOrder = approvePurchaseOrder;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const KG_PER_MON = 40;
function ratePerKg(rateBasis, rateValue) {
    return rateBasis === 'perKg' ? rateValue : rateValue / KG_PER_MON;
}
function uniqueSuffix() {
    return (0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 10);
}
function lotNo() {
    return `LOT-${Date.now()}-${uniqueSuffix()}`;
}
function stockMoveNo() {
    return `MV-${Date.now()}-${uniqueSuffix()}`;
}
function voucherNo() {
    return `VCH-${Date.now()}-${uniqueSuffix()}`;
}
function poNo() {
    return `PO-${Date.now()}-${uniqueSuffix()}`;
}
function lotLabel(poNoValue, productId, warehouseId) {
    return `LOT-${poNoValue}-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}-${Date.now()}-${uniqueSuffix()}`;
}
function resolveItemDisplayName(item, productName) {
    var _a, _b;
    return ((_a = item.productType) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = item.productName) === null || _b === void 0 ? void 0 : _b.trim()) || productName;
}
function numberValue(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function computePurchaseTotals(order) {
    var _a;
    const items = Array.isArray(order === null || order === void 0 ? void 0 : order.items) ? order.items : [];
    let totalBags = 0;
    let basePurchase = 0;
    for (const item of items) {
        const bags = numberValue(item === null || item === void 0 ? void 0 : item.bagCount);
        const actualKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.actualKgPerBag);
        const accountingKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.accountingKgPerBag);
        const stockKg = (item === null || item === void 0 ? void 0 : item.weightPolicy) === 'actual' ? actualKg : accountingKg;
        const lineRatePerKg = ratePerKg(item === null || item === void 0 ? void 0 : item.rateBasis, numberValue(item === null || item === void 0 ? void 0 : item.rateValue));
        totalBags += bags;
        basePurchase += stockKg * lineRatePerKg;
    }
    const bagCostMode = (order === null || order === void 0 ? void 0 : order.bagCostMode) || 'paid';
    const bagCostPerBag = numberValue(order === null || order === void 0 ? void 0 : order.bagCostPerBag);
    const bagCostTotal = bagCostMode === 'self' ? 0 : totalBags * bagCostPerBag;
    const extraCosts = numberValue(order === null || order === void 0 ? void 0 : order.transport) +
        numberValue((_a = order === null || order === void 0 ? void 0 : order.loadingUnloading) !== null && _a !== void 0 ? _a : order === null || order === void 0 ? void 0 : order.loading) +
        numberValue(order === null || order === void 0 ? void 0 : order.misc) +
        bagCostTotal;
    const totalCost = basePurchase + extraCosts;
    return {
        totalBags,
        basePurchase,
        bagCostTotal,
        extraCosts,
        totalCost,
    };
}
function toPurchaseOrderDto(order) {
    const totals = computePurchaseTotals(order);
    return Object.assign(Object.assign({}, order), { sellerSnapshot: (order === null || order === void 0 ? void 0 : order.seller)
            ? {
                id: order.seller.id,
                name: order.seller.name,
                address: order.seller.address,
                district: order.seller.district,
                market: order.seller.market,
                phone: order.seller.phone,
            }
            : order === null || order === void 0 ? void 0 : order.sellerSnapshot, totals: Object.assign(Object.assign({}, ((order === null || order === void 0 ? void 0 : order.totals) || {})), totals), totalCost: totals.totalCost });
}
function listPurchaseOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        const orders = yield prisma_1.prisma.purchaseOrder.findMany({
            include: {
                seller: true,
                warehouse: true,
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return orders.map((order) => toPurchaseOrderDto(order));
    });
}
function getPurchaseOrderById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const order = yield prisma_1.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                seller: true,
                warehouse: true,
                items: true
            }
        });
        if (!order) {
            throw new httpError_1.HttpError(404, 'Purchase order not found');
        }
        return toPurchaseOrderDto(order);
    });
}
function createDraft(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const seller = yield prisma_1.prisma.seller.findUnique({ where: { id: input.sellerId } });
        if (!seller)
            throw new httpError_1.HttpError(404, 'Seller not found');
        const warehouse = yield prisma_1.prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
        if (!warehouse)
            throw new httpError_1.HttpError(404, 'Warehouse not found');
        const productIds = [...new Set(input.items.map((item) => item.productId))];
        const products = yield prisma_1.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true }
        });
        const productNameById = new Map(products.map((product) => [product.id, product.name]));
        return prisma_1.prisma.purchaseOrder.create({
            data: {
                poNo: poNo(),
                status: 'DRAFT',
                purchaseType: input.purchaseType,
                sellerId: input.sellerId,
                warehouseId: input.warehouseId,
                transport: new client_1.Prisma.Decimal(input.transport),
                loading: new client_1.Prisma.Decimal(input.loading),
                loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading),
                misc: new client_1.Prisma.Decimal(input.misc),
                bagCostMode: input.bagCostMode,
                bagCostPerBag: new client_1.Prisma.Decimal(input.bagCostPerBag),
                remarks: input.remarks,
                productType: resolveItemDisplayName((_a = input.items[0]) !== null && _a !== void 0 ? _a : {}, productNameById.get(((_b = input.items[0]) === null || _b === void 0 ? void 0 : _b.productId) || '') || ''),
                varietyNote: input.varietyNote,
                destinationType: (_d = (_c = input.destinationRef) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : input.destinationKind,
                destinationRefId: (_e = input.destinationRef) === null || _e === void 0 ? void 0 : _e.id,
                destinationKind: input.destinationKind,
                destinationWarehouseId: (_f = input.destinationWarehouseId) !== null && _f !== void 0 ? _f : undefined,
                destinationCustomerId: (_g = input.destinationCustomerId) !== null && _g !== void 0 ? _g : undefined,
                transportMode: input.transportMode,
                driverId: input.driverId,
                driverName: input.driverName,
                truckNo: input.truckNo,
                route: input.route,
                items: {
                    create: input.items.map((x) => ({
                        productId: x.productId,
                        productName: resolveItemDisplayName(x, productNameById.get(x.productId) || ''),
                        bagCount: x.bagCount,
                        actualKgPerBag: new client_1.Prisma.Decimal(x.actualKgPerBag),
                        accountingKgPerBag: new client_1.Prisma.Decimal(x.accountingKgPerBag),
                        weightPolicy: x.weightPolicy,
                        rateBasis: x.rateBasis,
                        rateValue: new client_1.Prisma.Decimal(x.rateValue),
                    }))
                }
            },
            include: { items: true }
        });
    });
}
function updatePurchaseOrderDraft(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const existing = yield tx.purchaseOrder.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!existing) {
                throw new httpError_1.HttpError(404, 'Purchase order not found');
            }
            if (existing.status !== 'DRAFT') {
                throw new httpError_1.HttpError(409, 'Only draft PO can be edited');
            }
            const seller = yield tx.seller.findUnique({ where: { id: input.sellerId } });
            if (!seller)
                throw new httpError_1.HttpError(404, 'Seller not found');
            const warehouse = yield tx.warehouse.findUnique({ where: { id: input.warehouseId } });
            if (!warehouse)
                throw new httpError_1.HttpError(404, 'Warehouse not found');
            const productIds = [...new Set(input.items.map((item) => item.productId))];
            const products = yield tx.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true }
            });
            const productNameById = new Map(products.map((product) => [product.id, product.name]));
            yield tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            const updated = yield tx.purchaseOrder.update({
                where: { id },
                data: {
                    purchaseType: input.purchaseType,
                    sellerId: input.sellerId,
                    warehouseId: input.warehouseId,
                    transport: new client_1.Prisma.Decimal(input.transport),
                    loading: new client_1.Prisma.Decimal(input.loading),
                    loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading),
                    misc: new client_1.Prisma.Decimal(input.misc),
                    bagCostMode: input.bagCostMode,
                    bagCostPerBag: new client_1.Prisma.Decimal(input.bagCostPerBag),
                    remarks: input.remarks,
                    productType: resolveItemDisplayName((_a = input.items[0]) !== null && _a !== void 0 ? _a : {}, productNameById.get(((_b = input.items[0]) === null || _b === void 0 ? void 0 : _b.productId) || '') || ''),
                    varietyNote: input.varietyNote,
                    destinationType: (_d = (_c = input.destinationRef) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : input.destinationKind,
                    destinationRefId: (_e = input.destinationRef) === null || _e === void 0 ? void 0 : _e.id,
                    destinationKind: input.destinationKind,
                    destinationWarehouseId: (_f = input.destinationWarehouseId) !== null && _f !== void 0 ? _f : undefined,
                    destinationCustomerId: (_g = input.destinationCustomerId) !== null && _g !== void 0 ? _g : undefined,
                    transportMode: input.transportMode,
                    driverId: input.driverId,
                    driverName: input.driverName,
                    truckNo: input.truckNo,
                    route: input.route,
                    items: {
                        create: input.items.map((x) => ({
                            productId: x.productId,
                            productName: resolveItemDisplayName(x, productNameById.get(x.productId) || ''),
                            bagCount: x.bagCount,
                            actualKgPerBag: new client_1.Prisma.Decimal(x.actualKgPerBag),
                            accountingKgPerBag: new client_1.Prisma.Decimal(x.accountingKgPerBag),
                            weightPolicy: x.weightPolicy,
                            rateBasis: x.rateBasis,
                            rateValue: new client_1.Prisma.Decimal(x.rateValue)
                        }))
                    }
                },
                include: {
                    seller: true,
                    warehouse: true,
                    items: true
                }
            });
            return {
                success: true,
                message: 'Purchase order draft updated',
                data: updated
            };
        }));
    });
}
function approvePurchaseOrder(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const po = yield tx.purchaseOrder.findUnique({
                where: { id },
                include: {
                    items: true,
                    warehouse: true,
                    seller: true
                }
            });
            if (!po)
                throw new httpError_1.HttpError(404, 'Purchase order not found');
            if (po.status !== 'DRAFT')
                throw new httpError_1.HttpError(400, 'Only draft PO can be approved');
            if (!po.items.length)
                throw new httpError_1.HttpError(400, 'PO has no items');
            let totalBags = 0;
            let basePurchase = 0;
            let totalStockKg = 0;
            const poExtended = po;
            const bagCostPerBag = poExtended.bagCostMode === 'self' ? 0 : Number(po.bagCostPerBag);
            for (const item of po.items) {
                const bagCount = Number(item.bagCount);
                if (!Number.isFinite(bagCount) || bagCount <= 0) {
                    throw new httpError_1.HttpError(400, `Invalid bag count for product ${item.productId}: must be greater than 0`);
                }
                const actualKg = Number(item.actualKgPerBag);
                const accountingKg = Number(item.accountingKgPerBag);
                if (!Number.isFinite(actualKg) || actualKg < 0 || !Number.isFinite(accountingKg) || accountingKg < 0) {
                    throw new httpError_1.HttpError(400, `Invalid kg per bag values for product ${item.productId}`);
                }
                const actual = actualKg * bagCount;
                const accounting = accountingKg * bagCount;
                const stockKg = item.weightPolicy === 'actual' ? actual : accounting;
                if (stockKg <= 0) {
                    throw new httpError_1.HttpError(400, `Invalid stock quantity for product ${item.productId}: calculated as ${stockKg} kg`);
                }
                const rpk = ratePerKg(item.rateBasis, Number(item.rateValue));
                const lineBase = stockKg * rpk;
                totalBags += item.bagCount;
                totalStockKg += stockKg;
                basePurchase += lineBase;
                const lineCost = lineBase + item.bagCount * bagCostPerBag;
                const avgCostPerKg = stockKg > 0 ? lineCost / stockKg : 0;
                const lot = yield tx.lot.create({
                    data: {
                        lotNo: lotNo(),
                        label: lotLabel(po.poNo, item.productId, po.warehouseId),
                        productId: item.productId,
                        warehouseId: po.warehouseId,
                        availableKg: new client_1.Prisma.Decimal(stockKg),
                        avgCostPerKg: new client_1.Prisma.Decimal(avgCostPerKg),
                        sourcePoId: po.id,
                        sourcePoItemId: item.id
                    }
                });
                yield tx.stockMove.create({
                    data: {
                        moveNo: stockMoveNo(),
                        lotId: lot.id,
                        warehouseId: po.warehouseId,
                        qtyKg: new client_1.Prisma.Decimal(stockKg),
                        reason: client_1.StockMoveReason.PURCHASE,
                        refType: client_1.StockRefType.PO,
                        refId: po.id
                    }
                });
            }
            const headerLoading = Number((_a = poExtended.loadingUnloading) !== null && _a !== void 0 ? _a : po.loading);
            const extraCosts = Number(po.transport) + headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
            const totalCost = basePurchase + extraCosts;
            const inventoryAccount = yield tx.account.upsert({
                where: { code: 'AC-INVENTORY' },
                update: {},
                create: { code: 'AC-INVENTORY', name: 'Inventory', type: 'asset' }
            });
            const payableAccount = yield tx.account.upsert({
                where: { code: 'AC-PAYABLES' },
                update: {},
                create: { code: 'AC-PAYABLES', name: 'Payables', type: 'liability' }
            });
            const voucher = yield tx.voucher.create({
                data: {
                    voucherNo: voucherNo(),
                    vtype: 'journal',
                    vdate: new Date(),
                    narration: `Auto purchase approval for ${po.poNo}`,
                    purchaseOrderId: po.id
                }
            });
            yield tx.voucherRow.createMany({
                data: [
                    {
                        voucherId: voucher.id,
                        accountId: inventoryAccount.id,
                        dr: new client_1.Prisma.Decimal(totalCost),
                        cr: new client_1.Prisma.Decimal(0),
                        memo: `PO ${po.poNo} inventory`
                    },
                    {
                        voucherId: voucher.id,
                        accountId: payableAccount.id,
                        dr: new client_1.Prisma.Decimal(0),
                        cr: new client_1.Prisma.Decimal(totalCost),
                        memo: `PO ${po.poNo} payable`
                    }
                ]
            });
            const updated = yield tx.purchaseOrder.update({
                where: { id: po.id },
                data: { status: 'APPROVED' },
                include: { items: true }
            });
            return {
                purchaseOrder: updated,
                totals: {
                    stockKg: totalStockKg,
                    basePurchase,
                    extraCosts,
                    totalCost
                },
                voucherNo: voucher.voucherNo
            };
        }));
    });
}
