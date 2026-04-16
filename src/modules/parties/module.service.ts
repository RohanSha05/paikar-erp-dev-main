import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreatePartyInput, UpdatePartyInput } from './module.types';

export async function listParties() {
	return prisma.seller.findMany({
		orderBy: { createdAt: 'desc' }
	});
}

export async function createParty(input: CreatePartyInput) {
	return prisma.seller.create({ data: input });
}

export async function updateParty(id: string, input: UpdatePartyInput) {
	const seller = await prisma.seller.findUnique({ where: { id } });
	if (!seller) {
		throw new HttpError(404, 'Party not found');
	}

	return prisma.seller.update({
		where: { id },
		data: input
	});
}

export async function deleteParty(id: string) {
	const seller = await prisma.seller.findUnique({ where: { id } });
	if (!seller) {
		throw new HttpError(404, 'Party not found');
	}

	const linkedPurchaseOrders = await prisma.purchaseOrder.count({
		where: { sellerId: id }
	});

	if (linkedPurchaseOrders > 0) {
		throw new HttpError(409, 'Cannot delete seller because purchase orders exist');
	}

	await prisma.seller.delete({ where: { id } });

	return { id };
}
