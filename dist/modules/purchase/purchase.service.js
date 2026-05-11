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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPurchaseOrders = listPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.createDraft = createDraft;
exports.updatePurchaseOrderDraft = updatePurchaseOrderDraft;
exports.approvePurchaseOrder = approvePurchaseOrder;
exports.deletePurchaseOrder = deletePurchaseOrder;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
const sequence_id_1 = require("../../common/utils/sequence-id");
const KG_PER_MON = 40;
function ratePerKg(rateBasis, rateValue, bagCount = 0, stockKg = 0) {
    if (rateBasis === 'perKg')
        return rateValue;
    if (rateBasis === 'perMon')
        return rateValue / KG_PER_MON;
    // perBag: derive effective ratePerKg from total bag cost
    return stockKg > 0 ? (bagCount * rateValue) / stockKg : 0;
}
function lotNo(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.lot, 'lotNo', 'LOT');
    });
}
function stockMoveNo(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.stockMove, 'moveNo', 'MV');
    });
}
function voucherNo(tx_1) {
    return __awaiter(this, arguments, void 0, function* (tx, date = new Date()) {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH', date);
    });
}
function poNo() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.purchaseOrder, 'poNo', 'PO');
    });
}
function buildLotLabel(params) {
    const clean = (v) => v
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^\p{L}\p{N}\p{M}]/gu, '');
    const formatLotSeq = (lotNo) => {
        // extract last numeric part safely → LOT-005 → 005
        const match = lotNo.match(/(\d+)$/);
        return match ? match[1].padStart(3, '0') : lotNo;
    };
    const datePart = `${String(params.date.getDate()).padStart(2, '0')}` +
        `${String(params.date.getMonth() + 1).padStart(2, '0')}` +
        `${params.date.getFullYear()}`;
    const KG_PER_MON = 40;
    const mon = params.weightKg / KG_PER_MON;
    const monFormatted = mon % 1 === 0 ? `${mon}MON` : `${mon.toFixed(2)}MON`;
    return [
        `LOT-${formatLotSeq(params.lotNo)}`,
        clean(params.sellerName).toUpperCase(),
        datePart,
        clean(params.category),
        clean(params.productName),
        monFormatted,
        `${params.weightKg}KG`,
    ].join('-');
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
    const bagCostMode = (order === null || order === void 0 ? void 0 : order.bagCostMode) || 'paid';
    const bagCostPerBag = numberValue(order === null || order === void 0 ? void 0 : order.bagCostPerBag);
    const transport = numberValue(order === null || order === void 0 ? void 0 : order.transport);
    const loadingUnloading = numberValue((_a = order === null || order === void 0 ? void 0 : order.loadingUnloading) !== null && _a !== void 0 ? _a : order === null || order === void 0 ? void 0 : order.loading);
    const misc = numberValue(order === null || order === void 0 ? void 0 : order.misc);
    const headerExtraCosts = transport + loadingUnloading + misc;
    let totalBags = 0;
    let basePurchase = 0;
    let totalStockKg = 0;
    const rawLines = items.map((item) => {
        const bags = numberValue(item === null || item === void 0 ? void 0 : item.bagCount);
        const actualKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.actualKgPerBag);
        const accountingKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.accountingKgPerBag);
        const stockKg = (item === null || item === void 0 ? void 0 : item.weightPolicy) === 'actual' ? actualKg : accountingKg;
        const rateBasis = ((item === null || item === void 0 ? void 0 : item.rateBasis) || 'perMon');
        const rateValue = numberValue(item === null || item === void 0 ? void 0 : item.rateValue);
        let baseCost = 0;
        if (rateBasis === 'perBag') {
            baseCost = bags * rateValue;
        }
        else {
            const lineRatePerKg = ratePerKg(rateBasis, rateValue);
            baseCost = stockKg * lineRatePerKg;
        }
        totalBags += bags;
        totalStockKg += stockKg;
        basePurchase += baseCost;
        return {
            product: resolveItemDisplayName(item, (item === null || item === void 0 ? void 0 : item.productName) || ''),
            bags,
            actualKg,
            accountingKg,
            stockKg,
            baseCost,
            bagCost: 0,
            headerCostShare: 0,
            lineCost: 0,
            avgPerKg: 0,
            avgPerMon: 0,
            rateBasis,
            rateValue,
        };
    });
    const bagCostTotal = bagCostMode === 'self' ? 0 : totalBags * bagCostPerBag;
    const extraCosts = headerExtraCosts + bagCostTotal;
    const totalCost = basePurchase + extraCosts;
    const productSummaries = rawLines.map((line) => {
        const bagCost = bagCostMode === 'self' ? 0 : line.bags * bagCostPerBag;
        const headerCostShare = totalStockKg > 0 ? headerExtraCosts * (line.stockKg / totalStockKg) : 0;
        const lineCost = line.baseCost + bagCost + headerCostShare;
        const avgPerKg = line.stockKg > 0 ? lineCost / line.stockKg : 0;
        return Object.assign(Object.assign({}, line), { bagCost,
            headerCostShare,
            lineCost,
            avgPerKg, avgPerMon: avgPerKg * KG_PER_MON });
    });
    return {
        totalBags,
        totalStockKg,
        basePurchase,
        bagCostTotal,
        headerExtraCosts,
        extraCosts,
        totalCost,
        productSummaries,
    };
}
function computeInitialStockKg(order) {
    const items = Array.isArray(order === null || order === void 0 ? void 0 : order.items) ? order.items : [];
    return items.reduce((sum, item) => {
        const bags = numberValue(item === null || item === void 0 ? void 0 : item.bagCount);
        const actualKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.actualKgPerBag);
        const accountingKg = bags * numberValue(item === null || item === void 0 ? void 0 : item.accountingKgPerBag);
        const stockKg = (item === null || item === void 0 ? void 0 : item.weightPolicy) === 'actual' ? actualKg : accountingKg;
        return sum + stockKg;
    }, 0);
}
function computeRemainingStockKg(order) {
    const lots = Array.isArray(order === null || order === void 0 ? void 0 : order.lots) ? order.lots : [];
    if (!lots.length) {
        return (order === null || order === void 0 ? void 0 : order.status) === 'DRAFT' ? computeInitialStockKg(order) : 0;
    }
    return lots.reduce((sum, lot) => sum + numberValue(lot === null || lot === void 0 ? void 0 : lot.availableKg), 0);
}
function computeSoldState(order, initialStockKg, remainingStockKg) {
    if ((order === null || order === void 0 ? void 0 : order.status) !== 'APPROVED')
        return 'none';
    const eps = 0.00001;
    if (remainingStockKg <= eps)
        return 'full';
    if (remainingStockKg + eps < initialStockKg)
        return 'partial';
    return 'none';
}
function resolveVoucherAccountRef(tx, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield tx.account.findFirst({
            where: {
                OR: [
                    { code: key },
                    { id: key },
                ],
            },
            select: { id: true },
        });
        if (!account) {
            throw new httpError_1.HttpError(400, `Account not found: ${key}`);
        }
        return account;
    });
}
function postPurchaseAdvance(tx, po) {
    return __awaiter(this, void 0, void 0, function* () {
        const advancePaid = numberValue(po.advancePaid);
        if (!(advancePaid > 0)) {
            return;
        }
        const sellerAccount = yield (0, party_account_1.ensurePartyAccount)({
            kind: 'seller',
            refId: po.seller.id,
            name: po.seller.name,
            type: 'party',
        });
        const sellerAccountRef = yield resolveVoucherAccountRef(tx, sellerAccount.code);
        const instrumentKey = String(po.advanceInstrumentId || '').trim();
        const instrumentAccountRef = instrumentKey
            ? yield resolveVoucherAccountRef(tx, instrumentKey)
            : yield tx.account.upsert({
                where: { code: 'AC-CASH' },
                update: {},
                create: {
                    code: 'AC-CASH',
                    name: 'Cash',
                    type: 'cash',
                    active: true,
                },
            });
        const voucher = yield tx.voucher.create({
            data: {
                voucherNo: yield voucherNo(tx),
                vtype: 'payment',
                vdate: new Date(),
                narration: `Advance for PO ${po.poNo}`,
                purchaseOrderId: po.id,
            },
        });
        yield tx.voucherRow.createMany({
            data: [
                {
                    voucherId: voucher.id,
                    accountId: sellerAccountRef.id,
                    dr: new client_1.Prisma.Decimal(advancePaid),
                    cr: new client_1.Prisma.Decimal(0),
                    memo: `Advance on PO ${po.poNo}`,
                },
                {
                    voucherId: voucher.id,
                    accountId: instrumentAccountRef.id,
                    dr: new client_1.Prisma.Decimal(0),
                    cr: new client_1.Prisma.Decimal(advancePaid),
                    memo: `Advance on PO ${po.poNo}`,
                },
            ],
        });
    });
}
function toPurchaseOrderDto(order) {
    const totals = computePurchaseTotals(order);
    const initialStockKg = computeInitialStockKg(order);
    const remainingStockKg = computeRemainingStockKg(order);
    const soldState = computeSoldState(order, initialStockKg, remainingStockKg);
    return Object.assign(Object.assign({}, order), { sellerSnapshot: (order === null || order === void 0 ? void 0 : order.sellerSnapshot)
            ? order.sellerSnapshot
            : (order === null || order === void 0 ? void 0 : order.seller)
                ? {
                    id: order.seller.id,
                    name: order.seller.name,
                    address: order.seller.address,
                    district: order.seller.district,
                    market: order.seller.market,
                    phone: order.seller.phone,
                }
                : order === null || order === void 0 ? void 0 : order.sellerSnapshot, totals: Object.assign(Object.assign({}, ((order === null || order === void 0 ? void 0 : order.totals) || {})), totals), totalCost: totals.totalCost, initialStockKg,
        remainingStockKg,
        soldState });
}
function listPurchaseOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        const orders = yield prisma_1.prisma.purchaseOrder.findMany({
            include: {
                seller: true,
                warehouse: true,
                destinationCustomer: true,
                items: true,
                lots: {
                    select: {
                        id: true,
                        availableKg: true,
                        sourcePoItemId: true,
                    },
                },
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
                destinationCustomer: true,
                items: true,
                lots: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        warehouse: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
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
                poNo: yield poNo(),
                status: 'DRAFT',
                purchaseType: input.purchaseType,
                sellerId: input.sellerId,
                warehouseId: input.warehouseId,
                transport: new client_1.Prisma.Decimal(input.transport),
                loading: new client_1.Prisma.Decimal(input.loading),
                loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading),
                misc: new client_1.Prisma.Decimal(input.misc),
                advancePaid: new client_1.Prisma.Decimal(input.advancePaid || 0),
                advanceInstrumentId: input.advanceInstrumentId,
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
        }).then((created) => __awaiter(this, void 0, void 0, function* () {
            if (input.sellerSnapshot) {
                yield prisma_1.prisma.$executeRaw `
        UPDATE "PurchaseOrder"
        SET "sellerSnapshot" = ${JSON.stringify(input.sellerSnapshot)}::jsonb
        WHERE id = ${created.id}
      `;
            }
            return created;
        }));
    });
}
function updatePurchaseOrderDraft(id, input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const existing = yield tx.purchaseOrder.findUnique({
                where: { id },
                include: {
                    items: true,
                    warehouse: true,
                    seller: true,
                }
            });
            if (!existing) {
                throw new httpError_1.HttpError(404, 'Purchase order not found');
            }
            if (existing.status === 'APPROVED') {
                yield verifyConfirmedPurchasePassword(input.editPassword, userId, 'edit');
                yield validatePurchaseCanBeEdited(id);
                yield reversePurchaseOrderImpact(tx, existing, userId);
                yield tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            }
            else if (existing.status !== 'DRAFT') {
                throw new httpError_1.HttpError(409, 'Only draft or approved PO can be edited');
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
                    advancePaid: new client_1.Prisma.Decimal(input.advancePaid || 0),
                    advanceInstrumentId: input.advanceInstrumentId,
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
            if (input.sellerSnapshot) {
                yield tx.$executeRaw `
        UPDATE "PurchaseOrder"
        SET "sellerSnapshot" = ${JSON.stringify(input.sellerSnapshot)}::jsonb
        WHERE id = ${updated.id}
      `;
            }
            if (existing.status === 'APPROVED') {
                const reloaded = yield tx.purchaseOrder.findUnique({
                    where: { id: updated.id },
                    include: {
                        items: true,
                        warehouse: true,
                        seller: true,
                    }
                });
                if (!reloaded) {
                    throw new httpError_1.HttpError(404, 'Purchase order not found after update');
                }
                return applyApprovedPurchaseOrderImpact(tx, reloaded);
            }
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
            return applyApprovedPurchaseOrderImpact(tx, po);
        }));
    });
}
function verifyConfirmedPurchasePassword(password, userId, action) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userId) {
            throw new httpError_1.HttpError(401, 'Unauthorized');
        }
        if (!password) {
            throw new httpError_1.HttpError(403, `Confirmed purchase ${action} requires password`);
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true, active: true }
        });
        if (!user || !user.active) {
            throw new httpError_1.HttpError(401, 'Invalid user');
        }
        const ok = yield bcrypt_1.default.compare(password, user.passwordHash);
        if (!ok) {
            throw new httpError_1.HttpError(401, `Incorrect password for confirmed purchase ${action}`);
        }
    });
}
function reversePurchaseOrderImpact(tx, po, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Get all lots associated with this PO
        const lots = yield tx.lot.findMany({
            where: { sourcePoId: po.id },
            select: { id: true }
        });
        const lotIds = lots.map((lot) => lot.id);
        if (lotIds.length) {
            const params = lotIds.map((_, index) => `$${index + 1}`).join(',');
            yield tx.$queryRawUnsafe(`SELECT id FROM "Lot" WHERE id IN (${params}) FOR UPDATE`, ...lotIds);
        }
        // Reverse all stock moves for this PO
        const prevMoves = yield tx.stockMove.findMany({
            where: { refType: client_1.StockRefType.PO, refId: po.id }
        });
        for (const move of prevMoves) {
            const qty = Number(move.qtyKg || 0);
            yield tx.stockMove.create({
                data: {
                    moveNo: yield stockMoveNo(tx),
                    lotId: move.lotId,
                    warehouseId: move.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(-qty),
                    reason: client_1.StockMoveReason.ADJUSTMENT,
                    refType: client_1.StockRefType.PO,
                    refId: po.id,
                    memo: `Reversal of ${move.moveNo} for PO ${po.poNo}`,
                    createdBy: userId,
                }
            });
        }
        // Reverse all vouchers for this PO
        const prevVouchers = yield tx.voucher.findMany({
            where: { purchaseOrderId: po.id },
            include: { rows: true }
        });
        for (const voucher of prevVouchers) {
            const reversalVoucher = yield tx.voucher.create({
                data: {
                    voucherNo: yield voucherNo(tx),
                    vtype: voucher.vtype,
                    vdate: new Date(),
                    narration: `Reversal of ${voucher.voucherNo} for PO ${po.poNo}`,
                    purchaseOrderId: po.id,
                }
            });
            // Create reversing rows (DR/CR flipped)
            const reversalRows = voucher.rows.map((row) => ({
                voucherId: reversalVoucher.id,
                accountId: row.accountId,
                dr: new client_1.Prisma.Decimal(Number(row.cr || 0)),
                cr: new client_1.Prisma.Decimal(Number(row.dr || 0)),
                memo: row.memo,
            }));
            if (reversalRows.length) {
                yield tx.voucherRow.createMany({ data: reversalRows });
            }
        }
        // Update lot availableKg to restore reversed quantities
        for (const lotId of lotIds) {
            const sumRow = yield tx.stockMove.aggregate({
                where: { lotId },
                _sum: { qtyKg: true }
            });
            const totalQty = Number(((_a = sumRow._sum) === null || _a === void 0 ? void 0 : _a.qtyKg) || 0);
            yield tx.lot.update({
                where: { id: lotId },
                data: { availableKg: new client_1.Prisma.Decimal(Math.max(0, totalQty)) }
            });
        }
    });
}
function validatePurchaseCanBeDeleted(poId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if any SalesOrderItems reference lots from this PO
        const activeSalesCount = yield prisma_1.prisma.salesOrderItem.count({
            where: {
                lot: {
                    sourcePoId: poId
                },
                salesOrder: {
                    status: {
                        in: ['DRAFT', 'CONFIRMED']
                    }
                }
            }
        });
        if (activeSalesCount > 0) {
            throw new httpError_1.HttpError(409, `PO মুছে ফেলা যাচ্ছে না। এতে ${activeSalesCount}টি সক্রিয় সেলস অর্ডার রয়েছে। অনুগ্রহ করে আগে ওই সেলস অর্ডারগুলো মুছে ফেলুন বা ক্লিয়ার করুন।`);
        }
    });
}
function validatePurchaseCanBeEdited(poId) {
    return __awaiter(this, void 0, void 0, function* () {
        return validatePurchaseCanBeDeleted(poId);
    });
}
function applyApprovedPurchaseOrderImpact(tx, po) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const transportMode = String(po.transportMode || '').toLowerCase();
        const isOwnTruck = transportMode === 'owntruck';
        if (!po.items.length) {
            throw new httpError_1.HttpError(400, 'PO has no items');
        }
        const costBreakdown = computePurchaseTotals(po);
        let totalBags = 0;
        let basePurchase = 0;
        let totalStockKg = 0;
        const poExtended = po;
        const bagCostPerBag = poExtended.bagCostMode === 'self' ? 0 : Number(po.bagCostPerBag);
        const createdLotIds = [];
        for (const [index, item] of po.items.entries()) {
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
            let lineBase;
            let rpk;
            if (item.rateBasis === 'perBag') {
                lineBase = item.bagCount * Number(item.rateValue);
                rpk = stockKg > 0 ? lineBase / stockKg : 0;
            }
            else {
                rpk = ratePerKg(item.rateBasis, Number(item.rateValue));
                lineBase = stockKg * rpk;
            }
            totalBags += item.bagCount;
            totalStockKg += stockKg;
            basePurchase += lineBase;
            const lineSummary = costBreakdown.productSummaries[index];
            const lineCost = (_a = lineSummary === null || lineSummary === void 0 ? void 0 : lineSummary.lineCost) !== null && _a !== void 0 ? _a : (lineBase + item.bagCount * bagCostPerBag);
            const avgCostPerKg = (_b = lineSummary === null || lineSummary === void 0 ? void 0 : lineSummary.avgPerKg) !== null && _b !== void 0 ? _b : (stockKg > 0 ? lineCost / stockKg : 0);
            const product = yield tx.product.findUnique({
                where: { id: item.productId },
                select: {
                    name: true,
                    category: true,
                    unit: true,
                },
            });
            const nextLotNo = yield lotNo(tx);
            const sellerName = po.seller.name;
            const lot = yield tx.lot.create({
                data: {
                    lotNo: nextLotNo,
                    label: buildLotLabel({
                        lotNo: nextLotNo,
                        sellerName,
                        date: new Date(po.createdAt || new Date()),
                        category: (product === null || product === void 0 ? void 0 : product.category) || 'GEN',
                        productName: (product === null || product === void 0 ? void 0 : product.name) || 'UNKNOWN',
                        weightKg: stockKg,
                        rateBasis: item.rateBasis,
                        rateValue: Number(item.rateValue),
                    }),
                    productId: item.productId,
                    warehouseId: po.warehouseId,
                    availableKg: new client_1.Prisma.Decimal(stockKg),
                    avgCostPerKg: new client_1.Prisma.Decimal(avgCostPerKg),
                    sourcePoId: po.id,
                    sourcePoItemId: item.id,
                    meta: { kgPerBag: Number(item.actualKgPerBag), bagCount: Number(item.bagCount) }
                },
            });
            yield tx.stockMove.create({
                data: {
                    moveNo: yield stockMoveNo(tx),
                    lotId: lot.id,
                    warehouseId: po.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(stockKg),
                    reason: client_1.StockMoveReason.PURCHASE,
                    refType: client_1.StockRefType.PO,
                    refId: po.id
                }
            });
            createdLotIds.push(lot.id);
        }
        const headerLoading = Number((_c = poExtended.loadingUnloading) !== null && _c !== void 0 ? _c : po.loading);
        const transportCost = Number(po.transport);
        const extraCosts = transportCost + headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
        const totalCost = basePurchase + extraCosts;
        const inventoryAccount = yield tx.account.upsert({
            where: { code: 'AC-INVENTORY' },
            update: {},
            create: { code: 'AC-INVENTORY', name: 'Inventory', type: 'asset' }
        });
        const sellerAccount = yield (0, party_account_1.ensurePartyAccount)({
            kind: 'seller',
            refId: po.seller.id,
            name: po.seller.name,
            type: 'party',
        });
        const inventoryAccountRef = yield resolveVoucherAccountRef(tx, inventoryAccount.code);
        const sellerAccountRef = yield resolveVoucherAccountRef(tx, sellerAccount.code);
        let driverAccountRef = null;
        if (isOwnTruck) {
            const driverAccount = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'driver',
                refId: po.driverId,
                name: po.driverName || 'Driver',
                type: 'party',
            });
            driverAccountRef = yield resolveVoucherAccountRef(tx, driverAccount.code);
        }
        const voucher = yield tx.voucher.create({
            data: {
                voucherNo: yield voucherNo(tx),
                vtype: 'journal',
                vdate: new Date(),
                narration: `Auto purchase approval for ${po.poNo}${po.route ? ` - ${po.route}` : ''}`,
                purchaseOrderId: po.id
            }
        });
        const rows = [];
        rows.push({
            voucherId: voucher.id,
            accountId: inventoryAccountRef.id,
            dr: new client_1.Prisma.Decimal(totalCost),
            cr: new client_1.Prisma.Decimal(0),
            memo: `PO ${po.poNo} inventory`,
        });
        rows.push({
            voucherId: voucher.id,
            accountId: sellerAccountRef.id,
            dr: new client_1.Prisma.Decimal(0),
            cr: new client_1.Prisma.Decimal(basePurchase),
            memo: `PO ${po.poNo} goods payable`,
        });
        if (isOwnTruck && driverAccountRef && transportCost > 0) {
            rows.push({
                voucherId: voucher.id,
                accountId: driverAccountRef.id,
                dr: new client_1.Prisma.Decimal(0),
                cr: new client_1.Prisma.Decimal(transportCost),
                memo: `PO ${po.poNo}${po.route ? ` - ${po.route}` : ''}`,
            });
        }
        const otherCost = headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
        if (otherCost > 0) {
            const expenseAccount = yield tx.account.upsert({
                where: { code: 'AC-PURCHASE-EXP' },
                update: {},
                create: {
                    code: 'AC-PURCHASE-EXP',
                    name: 'Purchase Expenses',
                    type: 'expense',
                },
            });
            const expenseRef = yield resolveVoucherAccountRef(tx, expenseAccount.code);
            rows.push({
                voucherId: voucher.id,
                accountId: expenseRef.id,
                dr: new client_1.Prisma.Decimal(0),
                cr: new client_1.Prisma.Decimal(otherCost),
                memo: `PO ${po.poNo} extra cost`,
            });
        }
        yield tx.voucherRow.createMany({ data: rows });
        yield postPurchaseAdvance(tx, po);
        try {
            for (const lid of createdLotIds) {
                const sumRow = yield tx.stockMove.aggregate({ where: { lotId: lid }, _sum: { qtyKg: true } });
                const sumQty = Number(((_d = sumRow._sum) === null || _d === void 0 ? void 0 : _d.qtyKg) || 0);
                const lotRow = yield tx.lot.findUnique({ where: { id: lid }, select: { id: true, availableKg: true, label: true } });
                if (lotRow) {
                    const old = Number(lotRow.availableKg || 0);
                    if (Math.abs(old - sumQty) > 0.00001) {
                        yield tx.lot.update({ where: { id: lid }, data: { availableKg: new client_1.Prisma.Decimal(sumQty) } });
                        yield tx.$executeRaw `
            UPDATE "PurchaseOrder" SET remarks = COALESCE(remarks, '') || ${`\n[RECONCILE] Lot ${lotRow.label || lid}: adjusted ${old} -> ${sumQty}`} WHERE id = ${po.id}
          `;
                    }
                }
            }
        }
        catch (e) {
            console.warn('Reconciliation check failed for PO', po.id, String(e));
        }
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
                totalCost,
                productSummaries: costBreakdown.productSummaries,
            },
            voucherNo: voucher.voucherNo
        };
    });
}
function deletePurchaseOrder(id, input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                lots: { select: { id: true } }
            }
        });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Purchase order not found');
        }
        if (existing.status === 'APPROVED') {
            yield verifyConfirmedPurchasePassword(input.editPassword, userId, 'delete');
            yield validatePurchaseCanBeDeleted(id);
        }
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            if (existing.status === 'APPROVED') {
                yield reversePurchaseOrderImpact(tx, existing, userId);
            }
            yield tx.purchaseOrder.delete({ where: { id } });
            return { id };
        }));
    });
}
