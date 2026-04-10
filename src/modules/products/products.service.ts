import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createProduct(data: {
  code: string;
  name: string;
  category?: string;
  unit: 'kg' | 'mon' | 'bag';
  active: boolean;
}) {
  const existing = await prisma.product.findUnique({
    where: { code: data.code }
  });
  if (existing) {
    throw new HttpError(409, 'Product code already exists');
  }

  return prisma.product.create({ data });
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    category?: string;
    unit?: 'kg' | 'mon' | 'bag';
    active?: boolean;
  }
) {
  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) {
    throw new HttpError(404, 'Product not found');
  }

  return prisma.product.update({
    where: { id },
    data
  });
}
