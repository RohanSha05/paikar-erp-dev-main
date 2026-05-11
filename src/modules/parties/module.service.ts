import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreatePartyInput, UpdatePartyInput } from './module.types';
import { ensurePartyAccount } from '../accounting/party-account';

export async function listParties() {
	return prisma.seller.findMany({
		orderBy: { createdAt: 'desc' }
	});
}

export async function createParty(input: CreatePartyInput) {
	const { paona, dena, ...sellerData } = input;
	const seller = await prisma.seller.create({ data: sellerData });
	await ensurePartyAccount({
		kind: 'seller',
		refId: seller.id,
		name: seller.name,
		type: 'party',
		openingDr: paona,
		openingCr: dena,
	});
	return seller;
}

export async function updateParty(id: string, input: UpdatePartyInput) {
	const existingSeller = await prisma.seller.findUnique({ where: { id } });
	if (!existingSeller) {
		throw new HttpError(404, 'Party not found');
	}

	const updatedSeller = await prisma.seller.update({
		where: { id },
		data: input
	});

	await ensurePartyAccount({
		kind: 'seller',
		refId: updatedSeller.id,
		name: updatedSeller.name,
		type: 'party',
	});

	return updatedSeller;
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
