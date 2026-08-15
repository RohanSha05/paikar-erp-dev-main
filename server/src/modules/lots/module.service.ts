import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';

export async function listLots(availableOnly?: boolean) {
  return prisma.lot.findMany({
    where: availableOnly ? { availableKg: { gt: new Prisma.Decimal(0) } } : undefined,
    include: {
      product: true,
      warehouse: true,
      sourcePo: true,
      stockMoves: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
