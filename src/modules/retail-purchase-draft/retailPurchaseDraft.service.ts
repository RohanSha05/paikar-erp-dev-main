import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import { createParty } from '../parties/module.service';

export class RetailPurchaseDraftService {
    static async updateDraft(id: string, data: any) {
      // Only allow updating certain fields
      return prisma.retailPurchaseDraft.update({
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
    }

    static async deleteDraft(id: string) {
      return prisma.retailPurchaseDraft.delete({ where: { id } });
    }
  static async listDraftsByDate(date: string) {
    return prisma.retailPurchaseDraft.findMany({
      where: {
        date: new Date(date),
      },
      orderBy: { createdAt: 'asc' },
      include: { seller: true },
    });
  }
  static async createDraft(data: any) {
    // Validate required fields
    if (!data.date) throw new Error('Date is required');
    if (!data.mon) throw new Error('Mon is required');
    if (!data.price) throw new Error('Price is required');

    let sellerId = data.sellerId;
    // Removed: seller info should not change based on due payment; always use provided sellerId.

    // Create the draft
    return await prisma.retailPurchaseDraft.create({
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
  }
  /**
   * Finalize all drafts for a given date, merge into a PO, and update drafts.
   * Returns the created PO.
   */
  static async finalizeDraftsForDate(date: string, warehouseId: string, createdBy: string) {
    // Validate input
    if (!date || typeof date !== 'string' || isNaN(Date.parse(date))) {
      throw new Error('Invalid or missing date.');
    }
    if (!warehouseId || typeof warehouseId !== 'string') {
      throw new Error('Warehouse is required.');
    }
    // Find all DRAFTs for the date
    const drafts = await prisma.retailPurchaseDraft.findMany({
      where: {
        date: new Date(date),
        status: 'DRAFT',
      },
    });
    if (!drafts.length) throw new Error('No drafts to finalize for the selected date.');

    // Always use 'খুচরা বিক্রেতা' as seller for PO
    let seller = await prisma.seller.findFirst({ where: { name: 'খুচরা বিক্রেতা' } });
    if (!seller) {
      seller = await createParty({ name: 'খুচরা বিক্রেতা' });
    }
    const sellerId = seller.id;
    // Optionally, update all drafts to use this sellerId
    await prisma.retailPurchaseDraft.updateMany({
      where: { 
        date: new Date(date),
        status: 'DRAFT',
      },
      data: { sellerId },
    });
    // If any draft is missing sellerId, throw error (should not happen)
    if (!sellerId) throw new Error('Drafts are missing seller information.');
    // Create PO and items in a transaction (product-based logic)
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
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
          loading: 0,   // Set loading cost to 0 by default
          misc: 0,      // Set misc cost to 0 by default
          items: {
            create: drafts.map((d) => {
              const bagCount = d.mon ? Math.round(Number(d.mon) / 40) : 0;
              if (!d.productId) throw new Error(`Draft with id ${d.id} is missing productId.`);
              return {
                productId: d.productId,
                bagCount,
                actualKgPerBag: d.mon,
                accountingKgPerBag: d.mon,
                weightPolicy: 'retail',
                rateBasis: 'perMon',
                rateValue: d.price,
              };
            }),
          },
        },
        include: { items: true },
      });
      // Update drafts
      await tx.retailPurchaseDraft.updateMany({
        where: { id: { in: drafts.map((d) => d.id) } },
        data: { status: 'FINALIZED', poId: po.id },
      });
      return po;
    });
  }
}
