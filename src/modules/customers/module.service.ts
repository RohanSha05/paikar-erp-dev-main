import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateCustomerInput, UpdateCustomerInput } from './module.types';
import { ensurePartyAccount } from '../accounting/party-account';

export async function listCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      district: input.district,
      market: input.market,
      phone: input.phone,
      address: input.address,
      type: input.type || 'other',
      nidNumber: input.nidNumber,
      emergencyPhone: input.emergencyPhone,
    },
  });

  await ensurePartyAccount({
    kind: 'customer',
    refId: customer.id,
    name: customer.name,
    type: 'party',
  });

  return customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existingCustomer = await prisma.customer.findUnique({ where: { id } });
  if (!existingCustomer) {
    throw new HttpError(404, 'Customer not found');
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      name: input.name ?? existingCustomer.name,
      district: input.district ?? existingCustomer.district,
      market: input.market ?? existingCustomer.market,
      phone: input.phone ?? existingCustomer.phone,
      address: input.address ?? existingCustomer.address,
      type: input.type ?? existingCustomer.type,
      nidNumber: input.nidNumber ?? existingCustomer.nidNumber,
      emergencyPhone: input.emergencyPhone ?? existingCustomer.emergencyPhone,
    },
  });

  await ensurePartyAccount({
    kind: 'customer',
    refId: updatedCustomer.id,
    name: updatedCustomer.name,
    type: 'party',
  });

  return updatedCustomer;
}

export async function deleteCustomer(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new HttpError(404, 'Customer not found');
  }

  const linkedSalesOrders = await prisma.salesOrder.count({
    where: { customerId: id }
  });

  if (linkedSalesOrders > 0) {
    throw new HttpError(409, 'Cannot delete customer because sales orders exist');
  }

  await prisma.customer.delete({ where: { id } });

  return { id };
}