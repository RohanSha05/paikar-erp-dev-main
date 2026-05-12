import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateOrUpdateBusinessInfoInput } from './module.types';

function normalize(value?: string | null) {
	if (value === null || value === undefined) return null;
	return value.trim() || null;
}

export async function getBusinessInfo() {
	// Get the first/main business info record
	const info = await prisma.businessInfo.findFirst({
		orderBy: { createdAt: 'asc' }
	});
	return info;
}

export async function getAllBusinessInfo() {
	return prisma.businessInfo.findMany({
		orderBy: { createdAt: 'desc' }
	});
}

export async function createOrUpdateBusinessInfo(input: CreateOrUpdateBusinessInfoInput) {
	// If ID provided and exists, update it
	if (input.id) {
		const existing = await prisma.businessInfo.findUnique({
			where: { id: input.id }
		});
		if (existing) {
			return updateBusinessInfo(input.id, input);
		}
	}

	// Otherwise, check if any record exists, if so update it, else create
	const existing = await prisma.businessInfo.findFirst();
	if (existing) {
		return updateBusinessInfo(existing.id, input);
	}

	// Create new record
	const info = await prisma.businessInfo.create({
		data: {
			businessName: normalize(input.businessName),
			proprietorName: normalize(input.proprietorName),
			additionalProprietor: normalize(input.additionalProprietor),
			address: normalize(input.address),
			phone1: normalize(input.phone1),
			phone2: normalize(input.phone2)
		}
	});

	return info;
}

export async function updateBusinessInfo(id: string, input: CreateOrUpdateBusinessInfoInput) {
	const existing = await prisma.businessInfo.findUnique({
		where: { id }
	});
	if (!existing) {
		throw new HttpError(404, 'Business info not found');
	}

	const info = await prisma.businessInfo.update({
		where: { id },
		data: {
			businessName: input.businessName !== undefined ? normalize(input.businessName) : existing.businessName,
			proprietorName: input.proprietorName !== undefined ? normalize(input.proprietorName) : existing.proprietorName,
			additionalProprietor: input.additionalProprietor !== undefined ? normalize(input.additionalProprietor) : existing.additionalProprietor,
			address: input.address !== undefined ? normalize(input.address) : existing.address,
			phone1: input.phone1 !== undefined ? normalize(input.phone1) : existing.phone1,
			phone2: input.phone2 !== undefined ? normalize(input.phone2) : existing.phone2
		}
	});

	return info;
}
export async function deleteBusinessInfo(id: string) {
	const existing = await prisma.businessInfo.findUnique({
		where: { id }
	});
	if (!existing) {
		throw new HttpError(404, 'Business info not found');
	}

	const info = await prisma.businessInfo.delete({
		where: { id }
	});

	return info;
}