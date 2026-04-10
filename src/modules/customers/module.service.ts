import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateCustomerInput, UpdateCustomerInput } from './module.types';

export async function listCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({ data: input });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new HttpError(404, 'Customer not found');
  }

  return prisma.customer.update({
    where: { id },
    data: input
  });
}
