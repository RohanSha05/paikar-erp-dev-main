import { Prisma, StockMoveReason, StockRefType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateSalesOrderInput, UpdateSalesOrderInput } from './sales.schema';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';

async function soNo() {
  return nextDailySequenceIdForDelegate(prisma.salesOrder, 'soNo', 'SO');
}

async function stockMoveNo(tx: Prisma.TransactionClient) {
  return nextDailySequenceIdForDelegate(tx.stockMove, 'moveNo', 'SM');
}

async function voucherNo(tx: Prisma.TransactionClient, date: Date = new Date()) {
  return nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', date);
}

function ratePerKg(rateBasis: 'perKg' | 'perMon', rateValue: number) {
  return rateBasis === 'perKg' ? rateValue : rateValue / 40;
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, active: true }
  });

  if (!user || !user.active) {
    throw new HttpError(401, 'Invalid user');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
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

  const prevMoves = await tx.stockMove.findMany({ where: { refType: StockRefType.SO, refId: order.id } });
  for (const move of prevMoves) {
    const qty = Number(move.qtyKg || 0);

    await tx.stockMove.create({
      data: {
        moveNo: await stockMoveNo(tx),
        lotId: move.lotId,
        warehouseId: move.warehouseId,
        qtyKg: new Prisma.Decimal(-qty),
        reason: StockMoveReason.ADJUSTMENT,
        refType: StockRefType.SO,
        refId: order.id,
        memo: `Reversal of ${move.moveNo} for SO ${order.soNo}`,
        createdBy: userId,
        lotLabel: move.lotLabel,
      }
    });

    await tx.lot.update({
      where: { id: move.lotId },
      data: { availableKg: { increment: new Prisma.Decimal(Math.abs(qty)) } }
    });
  }

  const prevVouchers = await tx.voucher.findMany({ where: { salesOrderId: order.id }, include: { rows: true } });
  for (const voucher of prevVouchers) {
    const reversal = await tx.voucher.create({
      data: {
        voucherNo: await voucherNo(tx),
        vtype: voucher.vtype,
        vdate: new Date(),
        narration: `Reversal of ${voucher.voucherNo} for SO ${order.soNo}`,
        salesOrderId: order.id,
      }
    });

    const reversalRows = voucher.rows.map((row) => ({
      voucherId: reversal.id,
      accountId: row.accountId,
      dr: new Prisma.Decimal(Number(row.cr || 0)),
      cr: new Prisma.Decimal(Number(row.dr || 0)),
      memo: `Reversal of ${voucher.voucherNo}`,
    }));

    if (reversalRows.length) {
      await tx.voucherRow.createMany({ data: reversalRows });
    }
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
      createdBy: userId,
      items: {
        create: input.items.map((item) => ({
          lotId: item.lotId,
          productId: item.productId,
          productType: item.productType,
          qtyKg: new Prisma.Decimal(item.qtyKg),
          rateBasis: item.rateBasis,
          rateValue: new Prisma.Decimal(item.rateValue),
          ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
          lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
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

      // 1) Remove old sales order items (we keep the salesOrder record)
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

      // 2) Create new items
      const createdItems = input.items.map((item) => ({
        lotId: item.lotId,
        productId: item.productId,
        productType: item.productType,
        qtyKg: new Prisma.Decimal(item.qtyKg),
        rateBasis: item.rateBasis,
        rateValue: new Prisma.Decimal(item.rateValue),
        ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
        lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
        bagCount: item.bagCount
      }));

      // 3) Validate availability for new items and deduct stock with new stock moves
      const itemResults: Array<{ lotId: string; qtyKg: number }> = [];
      let totalBase = 0;
      let totalKg = 0;

      for (const item of input.items) {
        const lotRow = await tx.lot.findUnique({ where: { id: item.lotId } });
        if (!lotRow) throw new HttpError(404, `Lot not found: ${item.lotId}`);
        const avail = Number(lotRow.availableKg || 0);
        const qty = Number(item.qtyKg || 0);
        if (!Number.isFinite(qty) || qty <= 0) throw new HttpError(400, `Invalid quantity for item in lot ${item.lotId}: must be greater than 0`);
        if (avail < qty) throw new HttpError(409, `Insufficient stock in lot ${lotRow.label}`);

        // deduct
        await tx.lot.update({ where: { id: lotRow.id }, data: { availableKg: new Prisma.Decimal(avail - qty) } });

        await tx.stockMove.create({ data: { moveNo: await stockMoveNo(tx), lotId: lotRow.id, warehouseId: lotRow.warehouseId, qtyKg: new Prisma.Decimal(-qty), reason: StockMoveReason.SALE, refType: StockRefType.SO, refId: id, memo: `Sale order ${existing.soNo} (edit)`, createdBy: userId, lotLabel: lotRow.label } });

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
      const updated = await tx.salesOrder.update({ where: { id }, data: { customerId: input.customerId, customerSnapshot, transport: new Prisma.Decimal(input.transport), loadingUnloading: new Prisma.Decimal(input.loadingUnloading), misc: new Prisma.Decimal(input.misc), remarks: input.remarks, totalsJson: totalsJsonNew, confirmedAt: new Date(), confirmedBy: userId, items: { create: createdItems } }, include: { customer: true, items: { include: { lot: true, product: true } } } });

      // 5) Create accounting voucher for the new totals (similar to confirmSalesOrder)
      const customerAccountId = (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } }))?.customer?.id ? (await ensurePartyAccount({ kind: 'customer', refId: (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { id: true, name: true } } } }))!.customer!.id, name: (await tx.salesOrder.findUnique({ where: { id }, select: { customer: { select: { name: true } } } }))!.customer!.name, type: 'party' })).id : null;

      if (customerAccountId) {
        const incomeAccount = await tx.account.upsert({ where: { code: 'AC-INC' }, update: {}, create: { code: 'AC-INC', name: 'Income', type: 'income' } });

        const voucher = await tx.voucher.create({ data: { voucherNo: await voucherNo(tx), vtype: 'journal', vdate: new Date(), narration: `Sales order ${existing.soNo} (edit)`, salesOrderId: id } });

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
        items: {
          create: input.items.map((item) => ({
            lotId: item.lotId,
            productId: item.productId,
            productType: item.productType,
            qtyKg: new Prisma.Decimal(item.qtyKg),
            rateBasis: item.rateBasis,
            rateValue: new Prisma.Decimal(item.rateValue),
            ratePerKg: new Prisma.Decimal(ratePerKg(item.rateBasis, item.rateValue)),
            lineBase: new Prisma.Decimal(item.qtyKg * ratePerKg(item.rateBasis, item.rateValue)),
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

    const itemResults: Array<{ lotId: string; qtyKg: number }> = [];
    let totalBase = 0;
    let totalKg = 0;

    for (const item of order.items) {
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
          availableKg: new Prisma.Decimal(availableKg - qtyKg)
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