import { Prisma, StockMoveReason, StockRefType } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreatePurchaseOrderDraftInput, UpdatePurchaseOrderDraftInput } from './purchase.validator';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';

const KG_PER_MON = 40;

function ratePerKg(rateBasis: 'perKg' | 'perMon' | 'perBag', rateValue: number, bagCount = 0, stockKg = 0) {
  if (rateBasis === 'perKg') return rateValue;
  if (rateBasis === 'perMon') return rateValue / KG_PER_MON;
  // perBag: derive effective ratePerKg from total bag cost
  return stockKg > 0 ? (bagCount * rateValue) / stockKg : 0;
}

async function lotNo(tx: Prisma.TransactionClient) {
  return nextDailySequenceIdForDelegate(tx.lot, 'lotNo', 'LOT');
}

async function stockMoveNo(tx: Prisma.TransactionClient) {
  return nextDailySequenceIdForDelegate(tx.stockMove, 'moveNo', 'MV');
}

async function voucherNo(tx: Prisma.TransactionClient, date: Date = new Date()) {
  return nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', date);
}

async function poNo() {
  return nextDailySequenceIdForDelegate(prisma.purchaseOrder, 'poNo', 'PO');
} 

function buildLotLabel(params: {
  lotNo: string;
  sellerName: string;
  date: Date;
  category: string;
  productName: string;
  weightKg: number;
  rateBasis: 'perKg' | 'perMon' | 'perBag';  
  rateValue: number;      
}) {
  const clean = (v: string) =>
  v
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]/gu, ''); 

  const formatLotSeq = (lotNo: string) => {
    // extract last numeric part safely → LOT-005 → 005
    const match = lotNo.match(/(\d+)$/);
    return match ? match[1].padStart(3, '0') : lotNo;
  };

const datePart =
  `${String(params.date.getDate()).padStart(2, '0')}` +
  `${String(params.date.getMonth() + 1).padStart(2, '0')}` +
  `${params.date.getFullYear()}`;
  const KG_PER_MON = 40;
  const mon = params.weightKg / KG_PER_MON;

  const monFormatted =
    mon % 1 === 0 ? `${mon}MON` : `${mon.toFixed(2)}MON`;

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

function resolveItemDisplayName(item: { productType?: string | null; productName?: string | null }, productName: string) {
  return item.productType?.trim() || item.productName?.trim() || productName;
}

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}



function computePurchaseTotals(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  let totalBags = 0;
  let basePurchase = 0;

  for (const item of items) {
    const bags = numberValue(item?.bagCount);
    const actualKg = bags * numberValue(item?.actualKgPerBag);
    const accountingKg = bags * numberValue(item?.accountingKgPerBag);
    const stockKg = item?.weightPolicy === 'actual' ? actualKg : accountingKg;
    let lineBase: number;
if (item?.rateBasis === 'perBag') {
  lineBase = bags * numberValue(item?.rateValue);
} else {
  const lineRatePerKg = ratePerKg(item?.rateBasis as 'perKg' | 'perMon', numberValue(item?.rateValue));
  lineBase = stockKg * lineRatePerKg;
}
basePurchase += lineBase;

    totalBags += bags;
  }

  const bagCostMode = order?.bagCostMode || 'paid';
  const bagCostPerBag = numberValue(order?.bagCostPerBag);
  const bagCostTotal = bagCostMode === 'self' ? 0 : totalBags * bagCostPerBag;
  const extraCosts =
    numberValue(order?.transport) +
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

function computeInitialStockKg(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum: number, item: any) => {
    const bags = numberValue(item?.bagCount);
    const actualKg = bags * numberValue(item?.actualKgPerBag);
    const accountingKg = bags * numberValue(item?.accountingKgPerBag);
    const stockKg = item?.weightPolicy === 'actual' ? actualKg : accountingKg;
    return sum + stockKg;
  }, 0);
}

function computeRemainingStockKg(order: any) {
  const lots = Array.isArray(order?.lots) ? order.lots : [];
  if (!lots.length) {
    return order?.status === 'DRAFT' ? computeInitialStockKg(order) : 0;
  }
  return lots.reduce((sum: number, lot: any) => sum + numberValue(lot?.availableKg), 0);
}

function computeSoldState(order: any, initialStockKg: number, remainingStockKg: number): 'none' | 'partial' | 'full' {
  if (order?.status !== 'APPROVED') return 'none';
  const eps = 0.00001;
  if (remainingStockKg <= eps) return 'full';
  if (remainingStockKg + eps < initialStockKg) return 'partial';
  return 'none';
}

async function resolveVoucherAccountRef(tx: any, key: string) {
  const account = await tx.account.findFirst({
    where: {
      OR: [
        { code: key },
        { id: key },
      ],
    },
    select: { id: true },
  });

  if (!account) {
    throw new HttpError(400, `Account not found: ${key}`);
  }

  return account;
}

async function postPurchaseAdvance(tx: any, po: any) {
  const advancePaid = numberValue(po.advancePaid);
  if (!(advancePaid > 0)) {
    return;
  }

  const sellerAccount = await ensurePartyAccount({
    kind: 'seller',
    refId: po.seller.id,
    name: po.seller.name,
    type: 'party',
  });

  const sellerAccountRef = await resolveVoucherAccountRef(tx, sellerAccount.code);
  const instrumentKey = String(po.advanceInstrumentId || '').trim();
  const instrumentAccountRef = instrumentKey
    ? await resolveVoucherAccountRef(tx, instrumentKey)
    : await tx.account.upsert({
        where: { code: 'AC-CASH' },
        update: {},
        create: {
          code: 'AC-CASH',
          name: 'Cash',
          type: 'cash',
          active: true,
        },
      });

  const voucher = await tx.voucher.create({
    data: {
      voucherNo: await voucherNo(tx),
      vtype: 'payment',
      vdate: new Date(),
      narration: `Advance for PO ${po.poNo}`,
      purchaseOrderId: po.id,
    },
  });

  await tx.voucherRow.createMany({
    data: [
      {
        voucherId: voucher.id,
        accountId: sellerAccountRef.id,
        dr: new Prisma.Decimal(advancePaid),
        cr: new Prisma.Decimal(0),
        memo: `Advance on PO ${po.poNo}`,
      },
      {
        voucherId: voucher.id,
        accountId: instrumentAccountRef.id,
        dr: new Prisma.Decimal(0),
        cr: new Prisma.Decimal(advancePaid),
        memo: `Advance on PO ${po.poNo}`,
      },
    ],
  });
}

function toPurchaseOrderDto(order: any) {
  const totals = computePurchaseTotals(order);
  const initialStockKg = computeInitialStockKg(order);
  const remainingStockKg = computeRemainingStockKg(order);
  const soldState = computeSoldState(order, initialStockKg, remainingStockKg);
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
    initialStockKg,
    remainingStockKg,
    soldState,
  };
}

export async function listPurchaseOrders() {
  const orders = await prisma.purchaseOrder.findMany({
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
}

export async function getPurchaseOrderById(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
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
    throw new HttpError(404, 'Purchase order not found');
  }

  return toPurchaseOrderDto(order);
}

export async function createDraft(input: CreatePurchaseOrderDraftInput) {
  const seller = await prisma.seller.findUnique({ where: { id: input.sellerId } });
  if (!seller) throw new HttpError(404, 'Seller not found');

  const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
  if (!warehouse) throw new HttpError(404, 'Warehouse not found');

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true }
  });
  const productNameById = new Map(products.map((product) => [product.id, product.name]));

  return prisma.purchaseOrder.create({
    data: {
      poNo: await poNo(),
      status: 'DRAFT',
      purchaseType: input.purchaseType,
      sellerId: input.sellerId,
      warehouseId: input.warehouseId,
      transport: new Prisma.Decimal(input.transport),
        loading: new Prisma.Decimal(input.loading),
        loadingUnloading: new Prisma.Decimal(input.loadingUnloading),
      misc: new Prisma.Decimal(input.misc),
      advancePaid: new Prisma.Decimal(input.advancePaid || 0),
      advanceInstrumentId: input.advanceInstrumentId,
        bagCostMode: input.bagCostMode,
      bagCostPerBag: new Prisma.Decimal(input.bagCostPerBag),
      remarks: input.remarks,
        productType: resolveItemDisplayName(input.items[0] ?? {}, productNameById.get(input.items[0]?.productId || '') || ''),
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
            productName: resolveItemDisplayName(x, productNameById.get(x.productId) || ''),
          bagCount: x.bagCount,
          actualKgPerBag: new Prisma.Decimal(x.actualKgPerBag),
          accountingKgPerBag: new Prisma.Decimal(x.accountingKgPerBag),
          weightPolicy: x.weightPolicy,
          rateBasis: x.rateBasis,
          rateValue: new Prisma.Decimal(x.rateValue),
        }))
      }
    },
    include: { items: true }
  });
}

export async function updatePurchaseOrderDraft(
  id: string,
  input: UpdatePurchaseOrderDraftInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      throw new HttpError(404, 'Purchase order not found');
    }

    if (existing.status !== 'DRAFT') {
      throw new HttpError(409, 'Only draft PO can be edited');
    }

    const seller = await tx.seller.findUnique({ where: { id: input.sellerId } });
    if (!seller) throw new HttpError(404, 'Seller not found');

    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new HttpError(404, 'Warehouse not found');

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    });
    const productNameById = new Map(products.map((product) => [product.id, product.name]));

    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        purchaseType: input.purchaseType,
        sellerId: input.sellerId,
        warehouseId: input.warehouseId,
        transport: new Prisma.Decimal(input.transport),
        loading: new Prisma.Decimal(input.loading),
        loadingUnloading: new Prisma.Decimal(input.loadingUnloading),
        misc: new Prisma.Decimal(input.misc),
        advancePaid: new Prisma.Decimal(input.advancePaid || 0),
        advanceInstrumentId: input.advanceInstrumentId,
        bagCostMode: input.bagCostMode,
        bagCostPerBag: new Prisma.Decimal(input.bagCostPerBag),
        remarks: input.remarks,
        productType: resolveItemDisplayName(input.items[0] ?? {}, productNameById.get(input.items[0]?.productId || '') || ''),
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
            productName: resolveItemDisplayName(x, productNameById.get(x.productId) || ''),
            bagCount: x.bagCount,
            actualKgPerBag: new Prisma.Decimal(x.actualKgPerBag),
            accountingKgPerBag: new Prisma.Decimal(x.accountingKgPerBag),
            weightPolicy: x.weightPolicy,
            rateBasis: x.rateBasis,
            rateValue: new Prisma.Decimal(x.rateValue)
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

export async function approvePurchaseOrder(id: string) {
  return prisma.$transaction(async (tx) => {

    const po = await tx.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        warehouse: true,
        seller: true
      }
    });

    if (!po) throw new HttpError(404, 'Purchase order not found');
    if (po.status !== 'DRAFT') throw new HttpError(400, 'Only draft PO can be approved');
    if (!po.items.length) throw new HttpError(400, 'PO has no items');



    const transportMode = String(po.transportMode || '').toLowerCase();
    const isOwnTruck = transportMode === 'owntruck';

    if (isOwnTruck && !po.driverId) {
      throw new HttpError(400, 'Driver is required for OWN_TRUCK');
    }

    let totalBags = 0;
    let basePurchase = 0;
    let totalStockKg = 0;
    const poExtended = po as typeof po & { bagCostMode?: string | null; loadingUnloading?: Prisma.Decimal | null };
    const bagCostPerBag = poExtended.bagCostMode === 'self' ? 0 : Number(po.bagCostPerBag);

    for (const item of po.items) {
      const bagCount = Number(item.bagCount);
      if (!Number.isFinite(bagCount) || bagCount <= 0) {
        throw new HttpError(400, `Invalid bag count for product ${item.productId}: must be greater than 0`);
      }
      
      const actualKg = Number(item.actualKgPerBag);
      const accountingKg = Number(item.accountingKgPerBag);
      if (!Number.isFinite(actualKg) || actualKg < 0 || !Number.isFinite(accountingKg) || accountingKg < 0) {
        throw new HttpError(400, `Invalid kg per bag values for product ${item.productId}`);
      }

      const actual = actualKg * bagCount;
      const accounting = accountingKg * bagCount;
      const stockKg = item.weightPolicy === 'actual' ? actual : accounting;
      
      if (stockKg <= 0) {
        throw new HttpError(400, `Invalid stock quantity for product ${item.productId}: calculated as ${stockKg} kg`);
      }

     let lineBase: number;
     let rpk: number;

    if (item.rateBasis === 'perBag') {
      lineBase = item.bagCount * Number(item.rateValue);       // bags × rate
      rpk = stockKg > 0 ? lineBase / stockKg : 0;             // effective rate for avgCost
    } else {
      rpk = ratePerKg(item.rateBasis as 'perKg' | 'perMon', Number(item.rateValue));
      lineBase = stockKg * rpk;
    }
      totalBags += item.bagCount;
      totalStockKg += stockKg;
      basePurchase += lineBase;

      const lineCost = lineBase + item.bagCount * bagCostPerBag;
      const avgCostPerKg = stockKg > 0 ? lineCost / stockKg : 0;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          name: true,
          category: true,
          unit: true,
        },
      });

     const nextLotNo = await lotNo(tx);
     const sellerName = po.seller.name;

     const KG_PER_MON = 40;
     const monValue = stockKg / KG_PER_MON;

     console.log('PRODUCT DEBUG:', product);

      const lot = await tx.lot.create({
        data: {
          lotNo: nextLotNo,
          label: buildLotLabel({
          lotNo: nextLotNo,
          sellerName,
          date: new Date(po.createdAt || new Date()),
          category: product?.category || 'GEN',
          productName: product?.name || 'UNKNOWN',
          weightKg: stockKg,
          rateBasis: item.rateBasis as 'perKg' | 'perMon' | 'perBag',  // ✅ ADD
          rateValue: Number(item.rateValue), 
        }),
          productId: item.productId,
          warehouseId: po.warehouseId,
          availableKg: new Prisma.Decimal(stockKg),
          avgCostPerKg: new Prisma.Decimal(avgCostPerKg),
          sourcePoId: po.id,
          sourcePoItemId: item.id,
          meta: { kgPerBag: Number(item.actualKgPerBag) , bagCount: Number(item.bagCount)}
        },
      });

      await tx.stockMove.create({
        data: {
          moveNo: await stockMoveNo(tx),
          lotId: lot.id,
          warehouseId: po.warehouseId,
          qtyKg: new Prisma.Decimal(stockKg),
          reason: StockMoveReason.PURCHASE,
          refType: StockRefType.PO,
          refId: po.id
        }
      });
    }

    const headerLoading = Number(poExtended.loadingUnloading ?? po.loading);

    const transportCost = Number(po.transport);


    const extraCosts =
       transportCost +
       headerLoading +
      Number(po.misc) +
      totalBags * bagCostPerBag;

    // const headerLoading = Number(poExtended.loadingUnloading ?? po.loading);
    // const extraCosts = Number(po.transport) + headerLoading + Number(po.misc) + totalBags * bagCostPerBag;
    const totalCost = basePurchase + extraCosts;


    const inventoryAccount = await tx.account.upsert({
      where: { code: 'AC-INVENTORY' },
      update: {},
      create: { code: 'AC-INVENTORY', name: 'Inventory', type: 'asset' }
    });
    const sellerAccount = await ensurePartyAccount({
      kind: 'seller',
      refId: po.seller.id,
      name: po.seller.name, 
      type: 'party',
    });
    const inventoryAccountRef = await resolveVoucherAccountRef(tx, inventoryAccount.code);
    const sellerAccountRef = await resolveVoucherAccountRef(tx, sellerAccount.code);

    let driverAccountRef: any = null;


    if (isOwnTruck) {
      const driverAccount = await ensurePartyAccount({
        kind: 'driver',
        refId: po.driverId!,
        name: po.driverName || 'Driver',
        type: 'party',
      });

      driverAccountRef = await resolveVoucherAccountRef(tx, driverAccount.code);
    }

    const voucher = await tx.voucher.create({
      data: {
        voucherNo: await voucherNo(tx),
        vtype: 'journal',
        vdate: new Date(),
        narration: `Auto purchase approval for ${po.poNo}`,
        purchaseOrderId: po.id
      }
    });
    

   const rows: any[] = [];

    // 1. Inventory (FULL COST)
    rows.push({
      voucherId: voucher.id,
      accountId: inventoryAccountRef.id,
      dr: new Prisma.Decimal(totalCost),
      cr: new Prisma.Decimal(0),
      memo: `PO ${po.poNo} inventory`,
    });

    // 2. Seller (ONLY GOODS)
    rows.push({
      voucherId: voucher.id,
      accountId: sellerAccountRef.id,
      dr: new Prisma.Decimal(0),
      cr: new Prisma.Decimal(basePurchase),
      memo: `PO ${po.poNo} goods payable`,
    });

    // 3. Driver (ONLY TRANSPORT)
    if (isOwnTruck && driverAccountRef && transportCost > 0) {
    rows.push({
      voucherId: voucher.id,
      accountId: driverAccountRef.id,
      dr: new Prisma.Decimal(0),
      cr: new Prisma.Decimal(transportCost),
      memo: `PO ${po.poNo} transport`,
    });
  }

    // 4. OTHER COST (loading + misc + bag)
    const otherCost =
      headerLoading +
      Number(po.misc) +
      totalBags * bagCostPerBag;

    if (otherCost > 0) {
      const expenseAccount = await tx.account.upsert({
        where: { code: 'AC-PURCHASE-EXP' },
        update: {},
        create: {
          code: 'AC-PURCHASE-EXP',
          name: 'Purchase Expenses',
          type: 'expense',
        },
      });

      const expenseRef = await resolveVoucherAccountRef(tx, expenseAccount.code);

      rows.push({
        voucherId: voucher.id,
        accountId: expenseRef.id,
        dr: new Prisma.Decimal(0),
        cr: new Prisma.Decimal(otherCost),
        memo: `PO ${po.poNo} extra cost`,
      });
    }

    // FINAL INSERT
    await tx.voucherRow.createMany({
      data: rows,
    });
    await postPurchaseAdvance(tx, po);

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
