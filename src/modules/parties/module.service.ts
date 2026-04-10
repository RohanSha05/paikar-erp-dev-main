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
