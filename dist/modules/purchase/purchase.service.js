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
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
const sequence_id_1 = require("../../common/utils/sequence-id");
const KG_PER_MON = 40;
function ratePerKg(rateBasis, rateValue) {
    return rateBasis === 'perKg' ? rateValue : rateValue / KG_PER_MON;
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
	const clean = (v) =>
		v
			.trim()
			.replace(/\s+/g, "") // remove spaces
			.replace(/[^\p{L}\p{N}]/gu, ""); // keep ALL unicode letters + numbers
	const formatLotSeq = (lotNo) => {
		// extract last numeric part safely → LOT-005 → 005
		const match = lotNo.match(/(\d+)$/);
		return match ? match[1].padStart(3, "0") : lotNo;
	};
	const datePart =
		`${String(params.date.getDate()).padStart(2, "0")}` +
		`${String(params.date.getMonth() + 1).padStart(2, "0")}` +
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
	].join("-");
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
        const instrumentKey = String(po.advanceInstrumentId || 'AC-CASH').trim();
        const instrumentAccountRef = yield resolveVoucherAccountRef(tx, instrumentKey);
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
    return Object.assign(Object.assign({}, order), { sellerSnapshot: (order === null || order === void 0 ? void 0 : order.seller)
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
            const transportMode = String(po.transportMode || "").toLowerCase();
						const isOwnTruck = transportMode === "owntruck";
						if (isOwnTruck && !po.driverId) {
							throw new httpError_1.HttpError(
								400,
								"Driver is required for OWN_TRUCK",
							);
						}
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
								const KG_PER_MON = 40;
								const monValue = stockKg / KG_PER_MON;
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
            }
            const headerLoading = Number((_a = poExtended.loadingUnloading) !== null && _a !== void 0 ? _a : po.loading);
            const transportCost = Number(po.transport);
            const extraCosts = transportCost +
                headerLoading +
                Number(po.misc) +
                totalBags * bagCostPerBag;
            // const headerLoading = Number(poExtended.loadingUnloading ?? po.loading);
            // const extraCosts = Number(po.transport) + headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
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
                    narration: `Auto purchase approval for ${po.poNo}`,
                    purchaseOrderId: po.id
                }
            });
            const rows = [];
						// 1. Inventory (FULL COST)
						rows.push({
							voucherId: voucher.id,
							accountId: inventoryAccountRef.id,
							dr: new client_1.Prisma.Decimal(totalCost),
							cr: new client_1.Prisma.Decimal(0),
							memo: `PO ${po.poNo} inventory`,
						});
            // 2. Seller (ONLY GOODS)
            rows.push({
                voucherId: voucher.id,
                accountId: sellerAccountRef.id,
                dr: new client_1.Prisma.Decimal(0),
                cr: new client_1.Prisma.Decimal(basePurchase),
                memo: `PO ${po.poNo} goods payable`,
            });
            // 3. Driver (ONLY TRANSPORT)
            if (isOwnTruck && driverAccountRef && transportCost > 0) {
                rows.push({
                    voucherId: voucher.id,
                    accountId: driverAccountRef.id,
                    dr: new client_1.Prisma.Decimal(0),
                    cr: new client_1.Prisma.Decimal(transportCost),
                    memo: `PO ${po.poNo} transport`,
                });
            }
            // 4. OTHER COST (loading + misc + bag)
            const otherCost = headerLoading +
                Number(po.misc) +
                totalBags * bagCostPerBag;
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
            // FINAL INSERT
            yield tx.voucherRow.createMany({
                data: rows,
            });
            yield postPurchaseAdvance(tx, po);
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
