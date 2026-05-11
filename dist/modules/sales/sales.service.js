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
exports.listSalesOrders = listSalesOrders;
exports.getSalesOrderById = getSalesOrderById;
exports.createSalesOrderDraft = createSalesOrderDraft;
exports.updateSalesOrderDraft = updateSalesOrderDraft;
exports.deleteSalesOrder = deleteSalesOrder;
exports.confirmSalesOrder = confirmSalesOrder;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
const sequence_id_1 = require("../../common/utils/sequence-id");
function soNo() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.salesOrder, 'soNo', 'SO');
    });
}
function stockMoveNo(tx) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.stockMove, 'moveNo', 'SM');
    });
}
function voucherNo(tx_1) {
    return __awaiter(this, arguments, void 0, function* (tx, date = new Date()) {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH', date);
    });
}
function ratePerKg(rateBasis, rateValue) {
    return rateBasis === 'perKg' ? rateValue : rateValue / 40;
}
function validateLotsForCustomer(items, customerId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const lotIds = items.map((item) => item.lotId);
        const lots = yield prisma_1.prisma.lot.findMany({
            where: { id: { in: lotIds } },
            include: { sourcePo: { include: { destinationCustomer: true } } }
        });
        for (const lot of lots) {
            if (((_a = lot.sourcePo) === null || _a === void 0 ? void 0 : _a.destinationCustomerId) && lot.sourcePo.destinationCustomerId !== customerId) {
                const sourcePo = lot.sourcePo;
                throw new httpError_1.HttpError(400, `এই lot "${lot.label || lot.id}" ${((_b = sourcePo.destinationCustomer) === null || _b === void 0 ? void 0 : _b.name) || "নির্দিষ্ট customer"}-এর জন্য বরাদ্দ। এটি শুধু ওই customer-এর কাছেই বিক্রি করা যাবে।`);
            }
        }
    });
}
function getCustomerSnapshot(customerId, snapshot) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (snapshot) {
            return snapshot;
        }
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        return {
            id: customer.id,
            name: customer.name,
            district: (_a = customer.district) !== null && _a !== void 0 ? _a : undefined,
            market: (_b = customer.market) !== null && _b !== void 0 ? _b : undefined,
            address: (_c = customer.address) !== null && _c !== void 0 ? _c : undefined,
            phone: (_d = customer.phone) !== null && _d !== void 0 ? _d : undefined
        };
    });
}
function buildTotals(items, transport, loadingUnloading, misc) {
    let base = 0;
    let totalKg = 0;
    for (const item of items) {
        const lineRatePerKg = ratePerKg(item.rateBasis, item.rateValue);
        const lineBase = item.qtyKg * lineRatePerKg;
        base += lineBase;
        totalKg += item.qtyKg;
    }
    const extras = transport + loadingUnloading + misc;
    const total = base + extras;
    return {
        base,
        extras,
        total,
        totalKg,
        avgPerKg: totalKg > 0 ? total / totalKg : 0
    };
}
function verifyConfirmedSalesPassword(password, userId, action) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userId) {
            throw new httpError_1.HttpError(401, 'Unauthorized');
        }
        if (!password) {
            throw new httpError_1.HttpError(403, `Confirmed sales ${action} requires password`);
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
            throw new httpError_1.HttpError(401, `Incorrect password for confirmed sales ${action}`);
        }
    });
}
function reverseConfirmedSalesOrderImpact(tx, order, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const lotIds = Array.from(new Set(order.items.map((item) => item.lotId)));
        if (lotIds.length) {
            const params = lotIds.map((_, index) => `$${index + 1}`).join(',');
            yield tx.$queryRawUnsafe(`SELECT id FROM "Lot" WHERE id IN (${params}) FOR UPDATE`, ...lotIds);
        }
        const prevMoves = yield tx.stockMove.findMany({ where: { refType: client_1.StockRefType.SO, refId: order.id } });
        for (const move of prevMoves) {
            const qty = Number(move.qtyKg || 0);
            yield tx.stockMove.create({
                data: {
                    moveNo: yield stockMoveNo(tx),
                    lotId: move.lotId,
                    warehouseId: move.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(-qty),
                    reason: client_1.StockMoveReason.ADJUSTMENT,
                    refType: client_1.StockRefType.SO,
                    refId: order.id,
                    memo: `Reversal of ${move.moveNo} for SO ${order.soNo}`,
                    createdBy: userId,
                    lotLabel: move.lotLabel,
                }
            });
            yield tx.lot.update({
                where: { id: move.lotId },
                data: { availableKg: { increment: new client_1.Prisma.Decimal(Math.abs(qty)) } }
            });
        }
        const prevVouchers = yield tx.voucher.findMany({ where: { salesOrderId: order.id }, include: { rows: true } });
        for (const voucher of prevVouchers) {
            const reversal = yield tx.voucher.create({
                data: {
                    voucherNo: yield voucherNo(tx),
                    vtype: voucher.vtype,
                    vdate: new Date(),
                    narration: `Reversal of ${voucher.voucherNo} for SO ${order.soNo}`,
                    salesOrderId: order.id,
                }
            });
            const reversalRows = voucher.rows.map((row) => ({
                voucherId: reversal.id,
                accountId: row.accountId,
                dr: new client_1.Prisma.Decimal(Number(row.cr || 0)),
                cr: new client_1.Prisma.Decimal(Number(row.dr || 0)),
                memo: `Reversal of ${voucher.voucherNo}`,
            }));
            if (reversalRows.length) {
                yield tx.voucherRow.createMany({ data: reversalRows });
            }
        }
    });
}
function listSalesOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.salesOrder.findMany({
            include: {
                customer: true,
                items: {
                    include: {
                        lot: true,
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    });
}
function getSalesOrderById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const order = yield prisma_1.prisma.salesOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    include: {
                        lot: true,
                        product: true
                    }
                }
            }
        });
        if (!order) {
            throw new httpError_1.HttpError(404, 'Sales order not found');
        }
        return order;
    });
}
function createSalesOrderDraft(input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        // Validate that lots are available for this customer
        yield validateLotsForCustomer(input.items, input.customerId);
        const customerSnapshot = yield getCustomerSnapshot(input.customerId, input.customerSnapshot);
        const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);
        return prisma_1.prisma.salesOrder.create({
            data: {
                soNo: yield soNo(),
                status: 'DRAFT',
                customerId: input.customerId,
                customerSnapshot,
                transport: new client_1.Prisma.Decimal(input.transport),
                loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading),
                misc: new client_1.Prisma.Decimal(input.misc),
                remarks: input.remarks,
                totalsJson: totals,
                createdBy: userId,
                items: {
                    create: input.items.map((item) => ({
                        lotId: item.lotId,
                        productId: item.productId,
                        productType: item.productType,
                        qtyKg: new client_1.Prisma.Decimal(item.qtyKg),
                        rateBasis: item.rateBasis,
                        rateValue: new client_1.Prisma.Decimal(item.rateValue),
                        ratePerKg: new client_1.Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
                        lineBase: new client_1.Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
                        bagCount: item.bagCount,
                    }))
                }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        lot: true,
                        product: true
                    }
                }
            }
        });
    });
}
function updateSalesOrderDraft(id, input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.salesOrder.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Sales order not found');
        }
        if (existing.status === 'CONFIRMED') {
            yield verifyConfirmedSalesPassword(input.editPassword, userId, 'edit');
        }
        else if (existing.status !== 'DRAFT') {
            throw new httpError_1.HttpError(409, 'Only draft or confirmed sales orders can be updated');
        }
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) {
            throw new httpError_1.HttpError(404, 'Customer not found');
        }
        // Validate that lots are available for this customer
        yield validateLotsForCustomer(input.items, input.customerId);
        const customerSnapshot = yield getCustomerSnapshot(input.customerId, input.customerSnapshot);
        const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);
        // If the order is confirmed, perform rollback-and-reapply in a single transaction
        if (existing.status === 'CONFIRMED') {
            return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                yield reverseConfirmedSalesOrderImpact(tx, existing, userId);
                // 1) Remove old sales order items (we keep the salesOrder record)
                yield tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
                // 2) Create new items
                const createdItems = input.items.map((item) => ({
                    lotId: item.lotId,
                    productId: item.productId,
                    productType: item.productType,
                    qtyKg: new client_1.Prisma.Decimal(item.qtyKg),
                    rateBasis: item.rateBasis,
                    rateValue: new client_1.Prisma.Decimal(item.rateValue),
                    ratePerKg: new client_1.Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
                    lineBase: new client_1.Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
                    bagCount: item.bagCount
                }));
                // 3) Validate availability for new items and deduct stock with new stock moves
                const itemResults = [];
                let totalBase = 0;
                let totalKg = 0;
                for (const item of input.items) {
                    const lotRow = yield tx.lot.findUnique({ where: { id: item.lotId } });
                    if (!lotRow)
                        throw new httpError_1.HttpError(404, `Lot not found: ${item.lotId}`);
                    const avail = Number(lotRow.availableKg || 0);
                    const qty = Number(item.qtyKg || 0);
                    if (!Number.isFinite(qty) || qty <= 0)
                        throw new httpError_1.HttpError(400, `Invalid quantity for item in lot ${item.lotId}: must be greater than 0`);
                    if (avail < qty)
                        throw new httpError_1.HttpError(409, `Insufficient stock in lot ${lotRow.label}`);
                    // deduct
                    yield tx.lot.update({ where: { id: lotRow.id }, data: { availableKg: new client_1.Prisma.Decimal(avail - qty) } });
                    yield tx.stockMove.create({ data: { moveNo: yield stockMoveNo(tx), lotId: lotRow.id, warehouseId: lotRow.warehouseId, qtyKg: new client_1.Prisma.Decimal(-qty), reason: client_1.StockMoveReason.SALE, refType: client_1.StockRefType.SO, refId: id, memo: `Sale order ${existing.soNo} (edit)`, createdBy: userId, lotLabel: lotRow.label } });
                    totalBase += qty * Number(ratePerKg(item.rateBasis, item.rateValue));
                    totalKg += qty;
                    itemResults.push({ lotId: lotRow.id, qtyKg: qty });
                }
                const totalsJsonNew = {
                    base: totalBase,
                    extras: Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc),
                    total: totalBase + Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc),
                    totalKg,
                    avgPerKg: totalKg > 0 ? (totalBase + Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc)) / totalKg : 0
                };
                // 4) Insert created items and update salesOrder fields, keep as CONFIRMED and set confirmedAt/confirmedBy
                const updated = yield tx.salesOrder.update({ where: { id }, data: { customerId: input.customerId, customerSnapshot, transport: new client_1.Prisma.Decimal(input.transport), loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading), misc: new client_1.Prisma.Decimal(input.misc), remarks: input.remarks, totalsJson: totalsJsonNew, confirmedAt: new Date(), confirmedBy: userId, items: { create: createdItems } }, include: { customer: true, items: { include: { lot: true, product: true } } } });
                // 5) Create accounting voucher for the new totals (similar to confirmSalesOrder)
                const customerAccountId = ((_b = (_a = (yield tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } }))) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.id) ? (yield (0, party_account_1.ensurePartyAccount)({ kind: 'customer', refId: (yield tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } })).customer.id, name: (yield tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { name: true } } } })).customer.name, type: 'party' })).id : null;
                if (customerAccountId) {
                    const incomeAccount = yield tx.account.upsert({ where: { code: 'AC-INC' }, update: {}, create: { code: 'AC-INC', name: 'Income', type: 'income' } });
                    const voucher = yield tx.voucher.create({ data: { voucherNo: yield voucherNo(tx), vtype: 'journal', vdate: new Date(), narration: `Sales order ${existing.soNo} (edit)`, salesOrderId: id } });
                    yield tx.voucherRow.createMany({ data: [{ voucherId: voucher.id, accountId: customerAccountId, dr: new client_1.Prisma.Decimal(totalsJsonNew.total), cr: new client_1.Prisma.Decimal(0), memo: `SO ${existing.soNo} receivable (edit)` }, { voucherId: voucher.id, accountId: incomeAccount.id, dr: new client_1.Prisma.Decimal(0), cr: new client_1.Prisma.Decimal(totalsJsonNew.total), memo: `SO ${existing.soNo} income (edit)` }] });
                }
                return updated;
            }));
        }
        // Default: update draft as before
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
            return tx.salesOrder.update({
                where: { id },
                data: {
                    customerId: input.customerId,
                    customerSnapshot,
                    transport: new client_1.Prisma.Decimal(input.transport),
                    loadingUnloading: new client_1.Prisma.Decimal(input.loadingUnloading),
                    misc: new client_1.Prisma.Decimal(input.misc),
                    remarks: input.remarks,
                    totalsJson: totals,
                    items: {
                        create: input.items.map((item) => ({
                            lotId: item.lotId,
                            productId: item.productId,
                            productType: item.productType,
                            qtyKg: new client_1.Prisma.Decimal(item.qtyKg),
                            rateBasis: item.rateBasis,
                            rateValue: new client_1.Prisma.Decimal(item.rateValue),
                            ratePerKg: new client_1.Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
                            lineBase: new client_1.Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
                            bagCount: item.bagCount
                        }))
                    }
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            lot: true,
                            product: true
                        }
                    }
                }
            });
        }));
    });
}
function deleteSalesOrder(id, input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.salesOrder.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Sales order not found');
        }
        if (existing.status === 'CONFIRMED') {
            yield verifyConfirmedSalesPassword(input.editPassword, userId, 'delete');
        }
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            if (existing.status === 'CONFIRMED') {
                yield reverseConfirmedSalesOrderImpact(tx, existing, userId);
            }
            yield tx.salesOrder.delete({ where: { id } });
            return { id };
        }));
    });
}
function confirmSalesOrder(id, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const customerAccount = yield prisma_1.prisma.salesOrder.findUnique({
            where: { id },
            select: {
                customer: {
                    select: { id: true, name: true },
                },
            },
        });
        const customerAccountId = (customerAccount === null || customerAccount === void 0 ? void 0 : customerAccount.customer)
            ? (yield (0, party_account_1.ensurePartyAccount)({
                kind: 'customer',
                refId: customerAccount.customer.id,
                name: customerAccount.customer.name,
                type: 'party',
            })).id
            : null;
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const order = yield tx.salesOrder.findUnique({
                where: { id },
                include: {
                    items: true
                }
            });
            if (!order) {
                throw new httpError_1.HttpError(404, 'Sales order not found');
            }
            if (order.status !== 'DRAFT') {
                throw new httpError_1.HttpError(409, 'Only draft sales orders can be confirmed');
            }
            if (!order.items.length) {
                throw new httpError_1.HttpError(400, 'Sales order has no items');
            }
            const itemResults = [];
            let totalBase = 0;
            let totalKg = 0;
            for (const item of order.items) {
                const lot = yield tx.lot.findUnique({ where: { id: item.lotId } });
                if (!lot) {
                    throw new httpError_1.HttpError(404, `Lot not found: ${item.lotId}`);
                }
                const qtyKg = Number(item.qtyKg);
                if (!Number.isFinite(qtyKg) || qtyKg <= 0) {
                    throw new httpError_1.HttpError(400, `Invalid quantity for item in lot ${item.lotId}: must be greater than 0`);
                }
                const availableKg = Number(lot.availableKg);
                if (availableKg < qtyKg) {
                    throw new httpError_1.HttpError(409, `Insufficient stock in lot ${lot.label}`);
                }
                yield tx.lot.update({
                    where: { id: lot.id },
                    data: {
                        availableKg: new client_1.Prisma.Decimal(availableKg - qtyKg)
                    }
                });
                yield tx.stockMove.create({
                    data: {
                        moveNo: yield stockMoveNo(tx),
                        lotId: lot.id,
                        warehouseId: lot.warehouseId,
                        qtyKg: new client_1.Prisma.Decimal(-qtyKg),
                        reason: client_1.StockMoveReason.SALE,
                        refType: client_1.StockRefType.SO,
                        refId: order.id,
                        memo: `Sale order ${order.soNo}`,
                        createdBy: userId,
                        lotLabel: lot.label
                    }
                });
                totalBase += Number(item.lineBase);
                totalKg += qtyKg;
                itemResults.push({ lotId: lot.id, qtyKg });
            }
            const totalsJson = {
                base: totalBase,
                extras: Number(order.transport) + Number(order.loadingUnloading) + Number(order.misc),
                total: totalBase + Number(order.transport) + Number(order.loadingUnloading) + Number(order.misc),
                totalKg,
                avgPerKg: totalKg > 0 ? (totalBase + Number(order.transport) + Number(order.loadingUnloading) + Number(order.misc)) / totalKg : 0
            };
            const updated = yield tx.salesOrder.update({
                where: { id: order.id },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                    confirmedBy: userId,
                    totalsJson
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            lot: true,
                            product: true
                        }
                    }
                }
            });
            if (customerAccountId) {
                const incomeAccount = yield tx.account.upsert({
                    where: { code: 'AC-INC' },
                    update: {},
                    create: { code: 'AC-INC', name: 'Income', type: 'income' },
                });
                const voucher = yield tx.voucher.create({
                    data: {
                        voucherNo: yield voucherNo(tx),
                        vtype: 'journal',
                        vdate: new Date(),
                        narration: `Sales order ${order.soNo}`,
                        salesOrderId: order.id,
                    },
                });
                yield tx.voucherRow.createMany({
                    data: [
                        {
                            voucherId: voucher.id,
                            accountId: customerAccountId,
                            dr: new client_1.Prisma.Decimal(totalsJson.total),
                            cr: new client_1.Prisma.Decimal(0),
                            memo: `SO ${order.soNo} receivable`,
                        },
                        {
                            voucherId: voucher.id,
                            accountId: incomeAccount.id,
                            dr: new client_1.Prisma.Decimal(0),
                            cr: new client_1.Prisma.Decimal(totalsJson.total),
                            memo: `SO ${order.soNo} income`,
                        },
                    ],
                });
            }
            return {
                salesOrder: updated,
                totals: totalsJson,
                deductedLots: itemResults
            };
        }));
    });
}
