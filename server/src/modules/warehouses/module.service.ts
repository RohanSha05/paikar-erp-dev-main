import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateWarehouseInput, UpdateWarehouseInput } from './module.types';

export async function listWarehouses() {
	return prisma.warehouse.findMany({
		orderBy: { createdAt: 'desc' }
	});
}

export async function createWarehouse(input: CreateWarehouseInput) {
	const existing = await prisma.warehouse.findUnique({ where: { code: input.code } });
	if (existing) {
		throw new HttpError(409, 'Warehouse code already exists');
	}

	return prisma.warehouse.create({ data: input });
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
	const warehouse = await prisma.warehouse.findUnique({ where: { id } });
	if (!warehouse) {
		throw new HttpError(404, 'Warehouse not found');
	}

	return prisma.warehouse.update({
		where: { id },
		data: input
	});
}
