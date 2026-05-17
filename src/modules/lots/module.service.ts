import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';

type ListLotsParams = {
  availableOnly?: boolean;
  limit?: number;
  search?: string;
  productCategory?: string;
  productName?: string;
  customerId?: string;
};

export async function listLots(params: ListLotsParams = {}) {
  const availableOnly = Boolean(params.availableOnly);
  const limit = Number.isFinite(params.limit as number) ? Math.max(1, Math.min(100, Number(params.limit))) : undefined;
  const search = params.search?.trim();
  const productCategory = params.productCategory?.trim();
  const productName = params.productName?.trim();
  const customerId = params.customerId?.trim();

  const and: Prisma.LotWhereInput[] = [];

  if (availableOnly) {
    and.push({ availableKg: { gt: new Prisma.Decimal(0) } });
  }

  if (productCategory) {
    and.push({ product: { is: { category: productCategory } } });
  }

  if (productName) {
    and.push({ product: { is: { name: productName } } });
  }

  if (customerId) {
    and.push({
      OR: [
        { sourcePoId: null },
        { sourcePo: { is: { destinationCustomerId: customerId } } },
      ],
    });
  }

  if (search) {
    and.push({
      OR: [
        { lotNo: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { product: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { product: { is: { code: { contains: search, mode: 'insensitive' } } } },
        { sourcePo: { is: { poNo: { contains: search, mode: 'insensitive' } } } },
        { sourcePo: { is: { destinationCustomer: { is: { name: { contains: search, mode: 'insensitive' } } } } } },
      ],
    });
  }

  const lots = await prisma.lot.findMany({
    where: and.length ? { AND: and } : undefined,
    take: limit,
    include: {
      product: true,
      warehouse: true,
      sourcePo: {
        include: {
          destinationCustomer: true,
          items: true,
        }
      },
      stockMoves: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  function toFiniteNumber(value: unknown, fallback = 0) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function ratePerKg(rateBasis: string, rateValue: unknown, kgPerBag = 0) {
    const value = toFiniteNumber(rateValue, 0);
    if (rateBasis === 'perKg') return value;
    if (rateBasis === 'perMon') return value / 40;
    return kgPerBag > 0 ? value / kgPerBag : value / 40;
  }

  function computePurchaseLineSummary(po: any, line: any) {
    const items = Array.isArray(po?.items) ? po.items : [];
    let totalBags = 0;
    let totalStockKg = 0;
    let basePurchase = 0;

    const summaries: Array<{ itemId: string; bagCount: number; stockKg: number; baseCost: number; rateBasis: string; rateValue: number }> = items.map((item: any) => {
      const bagCount = toFiniteNumber(item?.bagCount);
      const actualKg = bagCount * toFiniteNumber(item?.actualKgPerBag);
      const accountingKg = bagCount * toFiniteNumber(item?.accountingKgPerBag);
      const stockKg = item?.weightPolicy === 'actual' ? actualKg : accountingKg;
      const rateBasis = String(item?.rateBasis || 'perMon');
      const rateValue = toFiniteNumber(item?.rateValue);

      let baseCost = 0;
      if (rateBasis === 'perBag') {
        baseCost = bagCount * rateValue;
      } else {
        baseCost = stockKg * ratePerKg(rateBasis, rateValue);
      }

      totalBags += bagCount;
      totalStockKg += stockKg;
      basePurchase += baseCost;

      return {
        itemId: item?.id,
        bagCount,
        stockKg,
        baseCost,
        rateBasis,
        rateValue,
      };
    });

    const bagCostMode = String(po?.bagCostMode || 'paid');
    const bagCostPerBag = bagCostMode === 'self' ? 0 : toFiniteNumber(po?.bagCostPerBag);
    const headerExtraCosts =
      toFiniteNumber(po?.transport) +
      toFiniteNumber(po?.loadingUnloading ?? po?.loading) +
      toFiniteNumber(po?.misc);
    const paidBags = bagCostMode === 'self'
      ? 0
      : (toFiniteNumber(po?.paidBags) > 0
          ? Math.min(totalBags, toFiniteNumber(po?.paidBags))
          : totalBags);
    const bagCostTotal = bagCostMode === 'self' ? 0 : paidBags * bagCostPerBag;
    const totalCost = basePurchase + headerExtraCosts + bagCostTotal;

    const matched = summaries.find((summary: { itemId: string; bagCount: number; stockKg: number; baseCost: number; rateBasis: string; rateValue: number }) => summary.itemId === line?.sourcePoItemId) || null;
    if (!matched || matched.stockKg <= 0) return 0;

    const lineBagShare = totalBags > 0 ? (matched.bagCount / totalBags) * bagCostTotal : 0;
    const lineHeaderShare = totalStockKg > 0 ? headerExtraCosts * (matched.stockKg / totalStockKg) : 0;
    const lineCost = matched.baseCost + lineBagShare + lineHeaderShare;

    return matched.stockKg > 0 ? lineCost / matched.stockKg : 0;
  }

  return lots.map((lot) => {
    const moveAvailableKg = Array.isArray(lot.stockMoves)
      ? lot.stockMoves.reduce((sum, move) => sum + toFiniteNumber(move?.qtyKg), 0)
      : 0;
    const databaseAvailableKg = toFiniteNumber(lot.availableKg, 0);
    const availableKg = moveAvailableKg > 0 ? moveAvailableKg : databaseAvailableKg;

    const directAvgCost = toFiniteNumber(lot.avgCostPerKg, 0);
    const derivedAvgCost = directAvgCost > 0
      ? directAvgCost
      : computePurchaseLineSummary(lot.sourcePo, lot);

    return {
      ...lot,
      availableKg,
      avgCostPerKg: derivedAvgCost,
    };
  });
}
