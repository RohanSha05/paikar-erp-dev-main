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
exports.RetailPurchaseDraftService = void 0;
const prisma_1 = require("../../db/prisma");
const module_service_1 = require("../parties/module.service");
class RetailPurchaseDraftService {
    static updateDraft(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only allow updating certain fields
            return prisma_1.prisma.retailPurchaseDraft.update({
                where: { id },
                data: {
                    mon: data.mon,
                    price: data.price,
                    notes: data.notes,
                    paidAmount: data.paidAmount,
                    dueAmount: data.dueAmount,
                    isDue: data.isDue,
                    sellerName: data.sellerName,
                    sellerAddress: data.sellerAddress,
                    sellerPhone: data.sellerPhone,
                    productId: data.productId,
                    productName: data.productName,
                    productCategory: data.productCategory,
                },
            });
        });
    }
    static deleteDraft(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.prisma.retailPurchaseDraft.delete({ where: { id } });
        });
    }
    static listDraftsByDate(date) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma_1.prisma.retailPurchaseDraft.findMany({
                where: {
                    date: new Date(date),
                },
                orderBy: { createdAt: 'asc' },
                include: { seller: true },
            });
        });
    }
    static createDraft(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate required fields
            if (!data.date)
                throw new Error('Date is required');
            if (!data.mon)
                throw new Error('Mon is required');
            if (!data.price)
                throw new Error('Price is required');
            let sellerId = data.sellerId;
            // Removed: seller info should not change based on due payment; always use provided sellerId.
            // Create the draft
            return yield prisma_1.prisma.retailPurchaseDraft.create({
                data: {
                    date: new Date(data.date),
                    sellerId,
                    market: data.market,
                    mon: data.mon,
                    price: data.price,
                    notes: data.notes,
                    paidAmount: data.paidAmount,
                    dueAmount: data.dueAmount,
                    isDue: data.isDue,
                    sellerName: data.sellerName,
                    sellerAddress: data.sellerAddress,
                    sellerPhone: data.sellerPhone,
                    productId: data.productId,
                    productName: data.productName,
                    productCategory: data.productCategory,
                    createdBy: data.createdBy,
                },
            });
        });
    }
    /**
     * Finalize all drafts for a given date, merge into a PO, and update drafts.
     * Returns the created PO.
     */
    static finalizeDraftsForDate(date, warehouseId, createdBy) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate input
            if (!date || typeof date !== 'string' || isNaN(Date.parse(date))) {
                throw new Error('Invalid or missing date.');
            }
            if (!warehouseId || typeof warehouseId !== 'string') {
                throw new Error('Warehouse is required.');
            }
            // Find all DRAFTs for the date
            const drafts = yield prisma_1.prisma.retailPurchaseDraft.findMany({
                where: {
                    date: new Date(date),
                    status: 'DRAFT',
                },
            });
            if (!drafts.length)
                throw new Error('No drafts to finalize for the selected date.');
            // Always use 'খুচরা বিক্রেতা' as seller for PO
            let seller = yield prisma_1.prisma.seller.findFirst({ where: { name: 'খুচরা বিক্রেতা' } });
            if (!seller) {
                seller = yield (0, module_service_1.createParty)({ name: 'খুচরা বিক্রেতা' });
            }
            const sellerId = seller.id;
            // Optionally, update all drafts to usse this sellerId
            yield prisma_1.prisma.retailPurchaseDraft.updateMany({
                where: {
                    date: new Date(date),
                    status: 'DRAFT',
                },
                data: { sellerId },
            });
            // If any draft is missing sellerId, throw error (should not happen)
            if (!sellerId)
                throw new Error('Drafts are missing seller information.');
            // Create PO and items in a transaction (product-based logic)
            return yield prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const po = yield tx.purchaseOrder.create({
                    data: {
                        poNo: `RET-${Date.now()}`,
                        status: 'DRAFT',
                        purchaseType: 'RETAIL',
                        sellerId,
                        warehouseId,
                        remarks: `Retail purchase finalized for ${date}`,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        transport: 0, // Set transport cost to 0 by default
                        loading: 0, // Set loading cost to 0 by default
                        misc: 0, // Set misc cost to 0 by default
                        bagCostPerBag: 0,
                        items: {
                            create: drafts.map((d) => {
                                const bagCount = d.mon ? Math.round(Number(d.mon) / 40) : 0;
                                if (!d.productId)
                                    throw new Error(`Draft with id ${d.id} is missing productId.`);
                                return {
                                    productId: d.productId,
                                    bagCount,
                                    actualKgPerBag: d.mon,
                                    accountingKgPerBag: d.mon,
                                    weightPolicy: 'retail',
                                    rateBasis: 'perMon',
                                    rateValue: d.price,
                                    bagCostPerBag: 0,
                                };
                            }),
                        },
                    },
                    include: { items: true },
                });
                // Update drafts
                yield tx.retailPurchaseDraft.updateMany({
                    where: { id: { in: drafts.map((d) => d.id) } },
                    data: { status: 'FINALIZED', poId: po.id },
                });
                return po;
            }));
        });
    }
}
exports.RetailPurchaseDraftService = RetailPurchaseDraftService;
