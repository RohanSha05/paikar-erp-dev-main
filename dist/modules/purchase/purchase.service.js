"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPurchaseOrders = listPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.createDraft = createDraft;
exports.updatePurchaseOrderDraft = updatePurchaseOrderDraft;
exports.approvePurchaseOrder = approvePurchaseOrder;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const KG_PER_MON = 40;
function ratePerKg(rateBasis, rateValue) {
    return rateBasis === 'perKg' ? rateValue : rateValue / KG_PER_MON;
}
function lotNo() {
    return `LOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function stockMoveNo() {
    return `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function voucherNo() {
    return `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function poNo() {
    return `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function lotLabel(poNoValue, productId, warehouseId) {
    return `LOT-${poNoValue}-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}-${Date.now()}`;
}
function numberValue(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function computePurchaseTotals(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    let totalBags = 0;
    let basePurchase = 0;
    for (const item of items) {
        const bags = numberValue(item?.bagCount);
        const actualKg = bags * numberValue(item?.actualKgPerBag);
        const accountingKg = bags * numberValue(item?.accountingKgPerBag);
        const stockKg = item?.weightPolicy === 'actual' ? actualKg : accountingKg;
        const lineRatePerKg = ratePerKg(item?.rateBasis, numberValue(item?.rateValue));
        totalBags += bags;
        basePurchase += stockKg * lineRatePerKg;
    }
    const bagCostMode = order?.bagCostMode || 'paid';
    const bagCostPerBag = numberValue(order?.bagCostPerBag);
    const bagCostTotal = bagCostMode === 'self' ? 0 : totalBags * bagCostPerBag;
    const extraCosts = numberValue(order?.transport) +
        numberValue(order?.loadingUnloading ?? order?.loading) +
        numberValue(order?.misc) +
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
    return {
        ...order,
        sellerSnapshot: order?.seller
            ? {
                id: order.seller.id,
                name: order.seller.name,
                address: order.seller.address,
                district: order.seller.district,
                market: order.seller.market,
                phone: order.seller.phone,
            }
            : order?.sellerSnapshot,
        totals: {
            ...(order?.totals || {}),
            ...totals,
        },
        totalCost: totals.totalCost,
    };
}
async function listPurchaseOrders() {
    const orders = await prisma_1.prisma.purchaseOrder.findMany({
        include: {
            seller: true,
            warehouse: true,
            items: true
        },
        orderBy: { createdAt: 'desc' }
    });
    return orders.map((order) => toPurchaseOrderDto(order));
}
async function getPurchaseOrderById(id) {
    const order = await prisma_1.prisma.purchaseOrder.findUnique({
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
}
async function createDraft(input) {
    const seller = await prisma_1.prisma.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller)
        throw new httpError_1.HttpError(404, 'Seller not found');
    const warehouse = await prisma_1.prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse)
        throw new httpError_1.HttpError(404, 'Warehouse not found');
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
            productType: input.items[0]?.productType,
            varietyNote: input.varietyNote,
            destinationType: input.destinationRef?.type ?? input.destinationKind,
            destinationRefId: input.destinationRef?.id,
            destinationKind: input.destinationKind,
            destinationWarehouseId: input.destinationWarehouseId ?? undefined,
            destinationCustomerId: input.destinationCustomerId ?? undefined,
            transportMode: input.transportMode,
            driverId: input.driverId,
            driverName: input.driverName,
            truckNo: input.truckNo,
            route: input.route,
            items: {
                create: input.items.map((x) => ({
                    productId: x.productId,
                    productName: x.productType,
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
}
async function updatePurchaseOrderDraft(id, input) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const existing = await tx.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Purchase order not found');
        }
        if (existing.status !== 'DRAFT') {
            throw new httpError_1.HttpError(409, 'Only draft PO can be edited');
        }
        const seller = await tx.seller.findUnique({ where: { id: input.sellerId } });
        if (!seller)
            throw new httpError_1.HttpError(404, 'Seller not found');
        const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
        if (!warehouse)
            throw new httpError_1.HttpError(404, 'Warehouse not found');
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        const updated = await tx.purchaseOrder.update({
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
                productType: input.items[0]?.productType,
                varietyNote: input.varietyNote,
                destinationType: input.destinationRef?.type ?? input.destinationKind,
                destinationRefId: input.destinationRef?.id,
                destinationKind: input.destinationKind,
                destinationWarehouseId: input.destinationWarehouseId ?? undefined,
                destinationCustomerId: input.destinationCustomerId ?? undefined,
                transportMode: input.transportMode,
                driverId: input.driverId,
                driverName: input.driverName,
                truckNo: input.truckNo,
                route: input.route,
                items: {
                    create: input.items.map((x) => ({
                        productId: x.productId,
                        productName: x.productType,
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
    });
}
async function approvePurchaseOrder(id) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
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
            const actual = Number(item.actualKgPerBag) * item.bagCount;
            const accounting = Number(item.accountingKgPerBag) * item.bagCount;
            const stockKg = item.weightPolicy === 'actual' ? actual : accounting;
            const rpk = ratePerKg(item.rateBasis, Number(item.rateValue));
            const lineBase = stockKg * rpk;
            totalBags += item.bagCount;
            totalStockKg += stockKg;
            basePurchase += lineBase;
            const lineCost = lineBase + item.bagCount * bagCostPerBag;
            const avgCostPerKg = stockKg > 0 ? lineCost / stockKg : 0;
            const lot = await tx.lot.create({
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
            await tx.stockMove.create({
                data: {
                    moveNo: stockMoveNo(),
                    lotId: lot.id,
                    warehouseId: po.warehouseId,
                    qtyKg: new client_1.Prisma.Decimal(stockKg),
                    reason: 'PURCHASE',
                    refType: 'PO',
                    refId: po.id
                }
            });
        }
        const headerLoading = Number(poExtended.loadingUnloading ?? po.loading);
        const extraCosts = Number(po.transport) + headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
        const totalCost = basePurchase + extraCosts;
        const inventoryAccount = await tx.account.findUnique({ where: { code: 'AC-INVENTORY' } });
        const payableAccount = await tx.account.findUnique({ where: { code: 'AC-PAYABLES' } });
        if (!inventoryAccount || !payableAccount) {
            throw new httpError_1.HttpError(500, 'Required accounts are missing (AC-INVENTORY / AC-PAYABLES)');
        }
        const voucher = await tx.voucher.create({
            data: {
                voucherNo: voucherNo(),
                vtype: 'journal',
                vdate: new Date(),
                narration: `Auto purchase approval for ${po.poNo}`,
                purchaseOrderId: po.id
            }
        });
        await tx.voucherRow.createMany({
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
        const updated = await tx.purchaseOrder.update({
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
    });
}
