import bcrypt from 'bcrypt';
import { Prisma, StockMoveReason, StockRefType } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from './sales.schema';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { syncLotMetaBagBalance } from '../../common/utils/lot-balance';

async function soNo() {
  return nextDailySequenceIdForDelegate(prisma.salesOrder, 'soNo', 'SO');
}

async function stockMoveNo(tx: Prisma.TransactionClient) {
  return nextDailySequenceIdForDelegate(tx.stockMove, 'moveNo', 'SM');
}

async function voucherNo(tx: Prisma.TransactionClient, date: Date = new Date()) {
  return nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', date);
}

function ratePerKg(rateBasis: 'perKg' | 'perMon' | 'perBag', rateValue: number, kgPerBag = 0) {
  if (rateBasis === 'perKg') return rateValue;
  if (rateBasis === 'perMon') return rateValue / 40;
  return kgPerBag > 0 ? rateValue / kgPerBag : rateValue / 40;
}

async function validateLotsForCustomer(items: CreateSalesOrderInput['items'], customerId: string) {
  const lotIds = items.map((item) => item.lotId);
  const lots = await prisma.lot.findMany({
    where: { id: { in: lotIds } },
    include: { sourcePo: { include: { destinationCustomer: true } } }
  });

  for (const lot of lots) {
    if (lot.sourcePo?.destinationCustomerId && lot.sourcePo.destinationCustomerId !== customerId) {
      const sourcePo = lot.sourcePo;
      throw new HttpError(
        400,
        `এই lot "${lot.label || lot.id}" ${sourcePo.destinationCustomer?.name || "নির্দিষ্ট customer"}-এর জন্য বরাদ্দ। এটি শুধু ওই customer-এর কাছেই বিক্রি করা যাবে।`
      );
    }
  }
}

async function getCustomerSnapshot(customerId: string, snapshot?: CreateSalesOrderInput['customerSnapshot']) {
  if (snapshot) {
    return snapshot;
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new HttpError(404, 'Customer not found');
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

function buildTotals(items: CreateSalesOrderInput['items'], transport: number, loadingUnloading: number, misc: number) {
  let base = 0;
  let totalKg = 0;

  for (const item of items) {
    const lineRatePerKg = ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0));
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

async function verifyConfirmedSalesPassword(
  password: string | undefined,
  userId: string | undefined,
  action: 'edit' | 'delete'
) {
  if (!userId) {
    throw new HttpError(401, 'Unauthorized');
  }
  if (!password) {
    throw new HttpError(403, `Confirmed sales ${action} requires password`);
  }

  const businessInfo = await prisma.businessInfo.findFirst({
    orderBy: { createdAt: 'asc' }
  }) as { operationPass?: string | null } | null;

  const expectedPassword = String(businessInfo?.operationPass || '').trim();
  let ok = false;

  if (expectedPassword) {
    ok = String(password).trim() === expectedPassword;
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!user?.passwordHash) {
      throw new HttpError(500, 'No password is configured for the current user');
    }

    ok = await bcrypt.compare(String(password).trim(), user.passwordHash);
  }

  if (!ok) {
    throw new HttpError(401, `Incorrect password for confirmed sales ${action}`);
  }
}

type ConfirmedSalesOrderLike = {
  id: string;
  soNo: string;
  items: Array<{
    lotId: string;
  }>;
};

async function reverseConfirmedSalesOrderImpact(
  tx: Prisma.TransactionClient,
  order: ConfirmedSalesOrderLike,
  userId?: string
) {
  const lotIds = Array.from(new Set(order.items.map((item) => item.lotId)));

  if (lotIds.length) {
    const params = lotIds.map((_, index) => `$${index + 1}`).join(',');
    await tx.$queryRawUnsafe(
      `SELECT id FROM "Lot" WHERE id IN (${params}) FOR UPDATE`,
      ...lotIds,
    );
  }

  // Remove previous stock moves for this SO so they don't appear duplicated in reports.
  const prevMoves = await tx.stockMove.findMany({ where: { refType: StockRefType.SO, refId: order.id } });
  if (prevMoves.length) {
    await tx.stockMove.deleteMany({ where: { refType: StockRefType.SO, refId: order.id } });
  }

  // Remove previous vouchers for this SO
  await tx.voucherRow.deleteMany({
    where: {
      voucher: {
        salesOrderId: order.id,
      },
    },
  });

  await tx.voucher.deleteMany({ where: { salesOrderId: order.id } });

  // Recalculate availableKg for affected lots after removing moves
  for (const lotId of lotIds) {
    const sumRow: any = await tx.stockMove.aggregate({
      where: { lotId },
      _sum: { qtyKg: true }
    });
    const computedAvailable = Number(sumRow._sum?.qtyKg || 0);
    const currentMeta = await tx.lot.findUnique({ where: { id: lotId }, select: { meta: true } });
    await tx.lot.update({
      where: { id: lotId },
      data: {
        availableKg: new Prisma.Decimal(computedAvailable),
        meta: syncLotMetaBagBalance(currentMeta?.meta as any, computedAvailable)
      }
    });
  }
}

export async function listSalesOrders() {
  return prisma.salesOrder.findMany({
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

export async function getSalesOrderById(id: string) {
  const order = await prisma.salesOrder.findUnique({
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
    throw new HttpError(404, 'Sales order not found');
  }

  return order;
}

export async function createSalesOrderDraft(input: CreateSalesOrderInput, userId?: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new HttpError(404, 'Customer not found');
  }

  // Validate that lots are available for this customer
  await validateLotsForCustomer(input.items, input.customerId);

  const customerSnapshot = await getCustomerSnapshot(input.customerId, input.customerSnapshot);
  const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);

  return prisma.salesOrder.create({
    data: {
      soNo: await soNo(),
      status: 'DRAFT',
      customerId: input.customerId,
      customerSnapshot,
      transport: new Prisma.Decimal(input.transport),
      loadingUnloading: new Prisma.Decimal(input.loadingUnloading),
      misc: new Prisma.Decimal(input.misc),
      remarks: input.remarks,
      totalsJson: totals,
      itemsSnapshot: input.items.map((item) => ({
        lotId: item.lotId,
        productType: item.productType,
        qtyKg: Number(item.qtyKg || 0),
        rateBasis: item.rateBasis,
        rateValue: Number(item.rateValue || 0),
        ratePerKg: Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
        lineBase: Number(item.qtyKg || 0) * Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          bagCount: Number(item.bagCount || 0)
      })),
      createdBy: userId,
      items: {
        create: input.items.map((item) => ({
          lotId: item.lotId,
          productId: item.productId,
          productType: item.productType,
          qtyKg: new Prisma.Decimal(item.qtyKg),
          rateBasis: item.rateBasis,
          rateValue: new Prisma.Decimal(item.rateValue),
          ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
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
}

export async function updateSalesOrderDraft(id: string, input: UpdateSalesOrderInput, userId?: string) {
  const existing = await prisma.salesOrder.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!existing) {
    throw new HttpError(404, 'Sales order not found');
  }

  if (existing.status === 'CONFIRMED') {
    await verifyConfirmedSalesPassword(input.editPassword, userId, 'edit');
  } else if (existing.status !== 'DRAFT') {
    throw new HttpError(409, 'Only draft or confirmed sales orders can be updated');
  }

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new HttpError(404, 'Customer not found');
  }

  // Validate that lots are available for this customer
  await validateLotsForCustomer(input.items, input.customerId);

  const customerSnapshot = await getCustomerSnapshot(input.customerId, input.customerSnapshot);
  const totals = buildTotals(input.items, input.transport, input.loadingUnloading, input.misc);

  // If the order is confirmed, perform rollback-and-reapply in a single transaction
  if (existing.status === 'CONFIRMED') {
    return prisma.$transaction(async (tx) => {
      await reverseConfirmedSalesOrderImpact(tx, existing, userId);

      // load existing items for in-place update
      const existingItems = await tx.salesOrderItem.findMany({ where: { salesOrderId: id } });
      const existingById: Record<string, any> = {};
      existingItems.forEach((it) => (existingById[it.id] = it));

      const keepIds: string[] = [];
      const createdIds: string[] = [];

      // 2) Validate availability for new/updated items and deduct stock with new stock moves
      const itemResults: Array<{ lotId: string; qtyKg: number }> = [];
      let totalBase = 0;
      let totalKg = 0;
      const itemsSnapshot: any[] = [];

      for (const item of input.items) {
        const lotRow = await tx.lot.findUnique({ where: { id: item.lotId } });
        if (!lotRow) throw new HttpError(404, `Lot not found: ${item.lotId}`);
        const avail = Number(lotRow.availableKg || 0);
        const qty = Number(item.qtyKg || 0);
        if (!Number.isFinite(qty) || qty <= 0) throw new HttpError(400, `Invalid quantity for item in lot ${item.lotId}: must be greater than 0`);
        if (avail < qty) throw new HttpError(409, `Insufficient stock in lot ${lotRow.label}`);

        // deduct
        await tx.lot.update({
          where: { id: lotRow.id },
          data: {
            availableKg: new Prisma.Decimal(avail - qty),
            meta: syncLotMetaBagBalance((lotRow as any).meta, avail - qty)
          }
        });

        await tx.stockMove.create({ data: { moveNo: await stockMoveNo(tx), lotId: lotRow.id, warehouseId: lotRow.warehouseId, qtyKg: new Prisma.Decimal(-qty), reason: StockMoveReason.SALE, refType: StockRefType.SO, refId: id, memo: `Sale order ${existing.soNo} (edit)`, createdBy: userId, lotLabel: lotRow.label } });

        // update existing item if id provided and found, otherwise create
        if ((item as any).id && existingById[(item as any).id]) {
          const upd = await tx.salesOrderItem.update({ where: { id: (item as any).id }, data: {
            lotId: item.lotId,
            productId: item.productId,
            productType: item.productType,
            qtyKg: new Prisma.Decimal(item.qtyKg),
            rateBasis: item.rateBasis,
            rateValue: new Prisma.Decimal(item.rateValue),
            ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
            lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
            bagCount: item.bagCount
          }});
          keepIds.push(upd.id);
        } else {
          const created = await tx.salesOrderItem.create({ data: {
            salesOrderId: id,
            lotId: item.lotId,
            productId: item.productId,
            productType: item.productType,
            qtyKg: new Prisma.Decimal(item.qtyKg),
            rateBasis: item.rateBasis,
            rateValue: new Prisma.Decimal(item.rateValue),
            ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
            lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
            bagCount: item.bagCount
          }});
          createdIds.push(created.id);
        }

        totalBase += qty * Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0)));
        totalKg += qty;
        itemResults.push({ lotId: lotRow.id, qtyKg: qty });
        itemsSnapshot.push({
          lotId: lotRow.id,
          productType: item.productType,
          qtyKg: qty,
          rateBasis: item.rateBasis,
          rateValue: Number(item.rateValue || 0),
          ratePerKg: Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          lineBase: Number((item.qtyKg || 0) * ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          bagCount: item.bagCount || 0,
          kgPerBag: Number((item as any).kgPerBag || 0),
          lotLabel: lotRow.label || null,
          avgCostPerKg: Number(lotRow.avgCostPerKg || 0),
        });
      }

      // remove any existing items that were not kept
      const toDelete = existingItems.filter((it) => !keepIds.includes(it.id) && !createdIds.includes(it.id)).map((i) => i.id);
      if (toDelete.length) {
        await tx.salesOrderItem.deleteMany({ where: { id: { in: toDelete } } });
      }

      const totalsJsonNew = {
        base: totalBase,
        extras: Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc),
        total: totalBase + Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc),
        totalKg,
        avgPerKg: totalKg > 0 ? (totalBase + Number(input.transport) + Number(input.loadingUnloading) + Number(input.misc)) / totalKg : 0
      };

      // update sales order totals and snapshot
      const updated = await tx.salesOrder.update({ where: { id }, data: { customerId: input.customerId, customerSnapshot, transport: new Prisma.Decimal(input.transport), loadingUnloading: new Prisma.Decimal(input.loadingUnloading), misc: new Prisma.Decimal(input.misc), remarks: input.remarks, totalsJson: totalsJsonNew, confirmedAt: new Date(), confirmedBy: userId, itemsSnapshot: itemsSnapshot }, include: { customer: true, items: { include: { lot: true, product: true } } } });

      // Recalculate availableKg for all affected lots from their stock moves (critical fix for multi-edit accuracy)
      const affectedLotIds = Array.from(new Set(itemResults.map(r => r.lotId)));
      for (const lotId of affectedLotIds) {
        const sumRow: any = await tx.stockMove.aggregate({
          where: { lotId },
          _sum: { qtyKg: true }
        });
        const computedAvailable = Number(sumRow._sum?.qtyKg || 0);
        const currentMeta = await tx.lot.findUnique({ where: { id: lotId }, select: { meta: true } });
        await tx.lot.update({
          where: { id: lotId },
          data: {
            availableKg: new Prisma.Decimal(computedAvailable),
            meta: syncLotMetaBagBalance(currentMeta?.meta as any, computedAvailable)
          }
        });
      }

      // 5) Create accounting voucher for the new totals (similar to confirmSalesOrder)
      const customerAccountId = (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } }))?.customer?.id ? (await ensurePartyAccount({ kind: 'customer', refId: (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } }))!.customer!.id, name: (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { name: true } } } }))!.customer!.name, type: 'party' })).id : null;

      if (customerAccountId) {
        const incomeAccount = await tx.account.upsert({ where: { code: 'AC-INC' }, update: {}, create: { code: 'AC-INC', name: 'Income', type: 'income' } });

        const voucher = await tx.voucher.create({ data: { voucherNo: await voucherNo(tx), vtype: 'journal', vdate: new Date(), narration: `Sales order ${existing.soNo} (edit)`, salesOrderId: id, status: 'POSTED' } });

        await tx.voucherRow.createMany({ data: [ { voucherId: voucher.id, accountId: customerAccountId, dr: new Prisma.Decimal(totalsJsonNew.total), cr: new Prisma.Decimal(0), memo: `SO ${existing.soNo} receivable (edit)` }, { voucherId: voucher.id, accountId: incomeAccount.id, dr: new Prisma.Decimal(0), cr: new Prisma.Decimal(totalsJsonNew.total), memo: `SO ${existing.soNo} income (edit)` } ] });
      }

      return updated;
    });
  }

  // Default: update draft as before
  return prisma.$transaction(async (tx) => {
    await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

    return tx.salesOrder.update({
      where: { id },
      data: {
        customerId: input.customerId,
        customerSnapshot,
        transport: new Prisma.Decimal(input.transport),
        loadingUnloading: new Prisma.Decimal(input.loadingUnloading),
        misc: new Prisma.Decimal(input.misc),
        remarks: input.remarks,
        totalsJson: totals,
        itemsSnapshot: input.items.map((item) => ({
          lotId: item.lotId,
          productType: item.productType,
          qtyKg: Number(item.qtyKg || 0),
          rateBasis: item.rateBasis,
          rateValue: Number(item.rateValue || 0),
          ratePerKg: Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          lineBase: Number(item.qtyKg || 0) * Number(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
          bagCount: Number(item.bagCount || 0),
          kgPerBag: Number((item as any).kgPerBag || 0),
        })),
        items: {
          create: input.items.map((item) => ({
            lotId: item.lotId,
            productId: item.productId,
            productType: item.productType,
            qtyKg: new Prisma.Decimal(item.qtyKg),
            rateBasis: item.rateBasis,
            rateValue: new Prisma.Decimal(item.rateValue),
            ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
            lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis as any, item.rateValue, Number((item as any).kgPerBag || 0))),
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
  });
}

export async function deleteSalesOrder(id: string, input: { editPassword?: string }, userId?: string) {
  const existing = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Sales order not found');
  }

  if (existing.status === 'CONFIRMED') {
    await verifyConfirmedSalesPassword(input.editPassword, userId, 'delete');
  }

  return prisma.$transaction(async (tx) => {
    if (existing.status === 'CONFIRMED') {
      await reverseConfirmedSalesOrderImpact(tx, existing, userId);
    }

    await tx.salesOrder.delete({ where: { id } });

    return { id };
  });
}

export async function confirmSalesOrder(id: string, userId?: string) {
  const customerAccount = await prisma.salesOrder.findUnique({
    where: { id },
    select: {
      customer: {
        select: { id: true, name: true },
      },
    },
  });

  const customerAccountId = customerAccount?.customer
    ? (await ensurePartyAccount({
        kind: 'customer',
        refId: customerAccount.customer.id,
        name: customerAccount.customer.name,
        type: 'party',
      })).id
    : null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new HttpError(404, 'Sales order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new HttpError(409, 'Only draft sales orders can be confirmed');
    }

    if (!order.items.length) {
      throw new HttpError(400, 'Sales order has no items');
    }

    const sourceSnapshot = Array.isArray((order as any).itemsSnapshot) ? (order as any).itemsSnapshot : [];
    const itemResults: Array<{ lotId: string; qtyKg: number }> = [];
    let totalBase = 0;
    let totalKg = 0;
    const itemsSnapshot: any[] = [];

    for (let index = 0; index < order.items.length; index++) {
      const item = order.items[index];
      const snapshotItem = sourceSnapshot[index] || {};
      const lot = await tx.lot.findUnique({ where: { id: item.lotId } });
      if (!lot) {
        throw new HttpError(404, `Lot not found: ${item.lotId}`);
      }

      const qtyKg = Number(item.qtyKg);
      if (!Number.isFinite(qtyKg) || qtyKg <= 0) {
        throw new HttpError(400, `Invalid quantity for item in lot ${item.lotId}: must be greater than 0`);
      }
      const availableKg = Number(lot.availableKg);
      if (availableKg < qtyKg) {
        throw new HttpError(409, `Insufficient stock in lot ${lot.label}`);
      }

      await tx.lot.update({
        where: { id: lot.id },
        data: {
          availableKg: new Prisma.Decimal(availableKg - qtyKg),
          meta: syncLotMetaBagBalance((lot as any).meta, availableKg - qtyKg)
        }
      });

      await tx.stockMove.create({
        data: {
          moveNo: await stockMoveNo(tx),
          lotId: lot.id,
          warehouseId: lot.warehouseId,
          qtyKg: new Prisma.Decimal(-qtyKg),
          reason: StockMoveReason.SALE,
          refType: StockRefType.SO,
          refId: order.id,
          memo: `Sale order ${order.soNo}`,
          createdBy: userId,
          lotLabel: lot.label
        }
      });

      totalBase += Number(item.lineBase);
      totalKg += qtyKg;
      itemResults.push({ lotId: lot.id, qtyKg });
      itemsSnapshot.push({
        lotId: lot.id,
        productType: item.productType,
        qtyKg,
        rateBasis: item.rateBasis,
        rateValue: Number(item.rateValue),
        ratePerKg: Number(item.ratePerKg || ratePerKg(item.rateBasis as any, Number(item.rateValue || 0), Number(snapshotItem.kgPerBag || 0))),
        lineBase: Number(item.lineBase || qtyKg * Number(item.ratePerKg || 0)),
        bagCount: Number(snapshotItem.bagCount || item.bagCount || 0),
        kgPerBag: Number(snapshotItem.kgPerBag || 0),
        lotLabel: lot.label || null,
        avgCostPerKg: Number(lot.avgCostPerKg || 0),
      });
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
        totalsJson,
        itemsSnapshot: itemsSnapshot
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
      const incomeAccount = await tx.account.upsert({
        where: { code: 'AC-INC' },
        update: {},
        create: { code: 'AC-INC', name: 'Income', type: 'income' },
      });

      const voucher = await tx.voucher.create({
        data: {
          voucherNo: await voucherNo(tx),
          vtype: 'journal',
          vdate: new Date(),
          narration: `Sales order ${order.soNo}`,
          salesOrderId: order.id,
          status: 'POSTED'
        },
      });

      await tx.voucherRow.createMany({
        data: [
          {
            voucherId: voucher.id,
            accountId: customerAccountId,
            dr: new Prisma.Decimal(totalsJson.total),
            cr: new Prisma.Decimal(0),
            memo: `SO ${order.soNo} receivable`,
          },
          {
            voucherId: voucher.id,
            accountId: incomeAccount.id,
            dr: new Prisma.Decimal(0),
            cr: new Prisma.Decimal(totalsJson.total),
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
  });
}