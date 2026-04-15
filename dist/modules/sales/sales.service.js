"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSalesOrders = listSalesOrders;
exports.getSalesOrderById = getSalesOrderById;
exports.createSalesOrderDraft = createSalesOrderDraft;
exports.updateSalesOrderDraft = updateSalesOrderDraft;
exports.confirmSalesOrder = confirmSalesOrder;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function soNo() {
    return `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function stockMoveNo() {
    return `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function ratePerKg(rateBasis, rateValue) {
    return rateBasis === 'perKg' ? rateValue : rateValue / 40;
}
async function getCustomerSnapshot(customerId, snapshot) {
    if (snapshot) {
        return snapshot;
    }
    const customer = await prisma_1.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
        throw new httpError_1.HttpError(404, 'Customer not found');
    }
    return {
        id: customer.id,
        name: customer.name,
        district: customer.district ?? undefined,
        market: customer.market ?? undefined,
        address: customer.address ?? undefined,
        phone: customer.phone ?? undefined
    };
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
async function listSalesOrders() {
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
}
async function getSalesOrderById(id) {
    const order = await prisma_1.prisma.salesOrder.findUnique({
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
}
async function createSalesOrderDraft(input, userId) {
    const customer = await prisma_1.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
        throw new httpError_1.HttpError(404, 'Customer not found');
    }
    const customerSnapshot = await getCustomerSnapshot(input.customerId, input.customerSnapshot);
    const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);
    return prisma_1.prisma.salesOrder.create({
        data: {
            soNo: soNo(),
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
                    lineBase: new client_1.Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue))
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
}
async function updateSalesOrderDraft(id, input) {
    const existing = await prisma_1.prisma.salesOrder.findUnique({
        where: { id },
        include: { items: true }
    });
    if (!existing) {
        throw new httpError_1.HttpError(404, 'Sales order not found');
    }
    if (existing.status !== 'DRAFT') {
        throw new httpError_1.HttpError(409, 'Only draft sales orders can be updated');
    }
    const customer = await prisma_1.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
        throw new httpError_1.HttpError(404, 'Customer not found');
    }
    const customerSnapshot = await getCustomerSnapshot(input.customerId, input.customerSnapshot);
    const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);
    return prisma_1.prisma.$transaction(async (tx) => {
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
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
                        lineBase: new client_1.Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue))
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
async function confirmSalesOrder(id, userId) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.findUnique({
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
            const lot = await tx.lot.findUnique({ where: { id: item.lotId } });
            if (!lot) {
                throw new httpError_1.HttpError(404, `Lot not found: ${item.lotId}`);
            }
            const qtyKg = Number(item.qtyKg);
            const availableKg = Number(lot.availableKg);
            if (availableKg < qtyKg) {
                throw new httpError_1.HttpError(409, `Insufficient stock in lot ${lot.label}`);
            }
            await tx.lot.update({
                where: { id: lot.id },
                data: {
                    availableKg: new client_1.Prisma.Decimal(availableKg - qtyKg)
                }
            });
            await tx.stockMove.create({
                data: {
                    moveNo: stockMoveNo(),
                    lotId: lot.id,
                    warehouseId: lot.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(qtyKg),
                    reason: 'SALE',
                    refType: 'SO',
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
        const updated = await tx.salesOrder.update({
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
        return {
            salesOrder: updated,
            totals: totalsJson,
            deductedLots: itemResults
        };
    });
}
