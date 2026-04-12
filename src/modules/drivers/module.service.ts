import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateDriverInput, UpdateDriverInput } from './module.types';

function normalize(value?: string) {
	return value?.trim() || undefined;
}

function generateDriverId() {
	return `DRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function listDrivers() {
	return prisma.driver.findMany({
		orderBy: { createdAt: 'desc' }
	});
}

export async function createDriver(input: CreateDriverInput) {
	const id = normalize(input.id) || generateDriverId();
	const exists = await prisma.driver.findUnique({ where: { id } });
	if (exists) {
		throw new HttpError(409, 'Driver ID already exists');
	}

	return prisma.driver.create({
		data: {
			id,
			name: input.name.trim(),
			phone: normalize(input.phone),
			truckNo: normalize(input.truckNo),
			licenseNo: normalize(input.licenseNo),
			active: input.active !== false
		}
	});
}

export async function updateDriver(id: string, input: UpdateDriverInput) {
	const existing = await prisma.driver.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Driver not found');
	}

	return prisma.driver.update({
		where: { id },
		data: {
			name: input.name?.trim(),
			phone: normalize(input.phone),
			truckNo: normalize(input.truckNo),
			licenseNo: normalize(input.licenseNo),
			active: input.active
		}
	});
}