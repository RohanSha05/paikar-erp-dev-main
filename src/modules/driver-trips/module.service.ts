import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateDriverTripInput, UpdateDriverTripInput } from './module.types';

function normalize(value?: string | null) {
	if (value === null) return null;
	return value?.trim() || undefined;
}

function generateTripId() {
	return `TRIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function parseDate(value: string) {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) {
		throw new HttpError(400, 'Invalid trip date');
	}
	return d;
}

export async function listDriverTrips() {
	return prisma.driverTrip.findMany({
		orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
	});
}

export async function createDriverTrip(input: CreateDriverTripInput) {
	const tripId = normalize(input.id) || generateTripId();
	const existing = await prisma.driverTrip.findUnique({ where: { id: tripId } });
	if (existing) {
		throw new HttpError(409, 'Trip ID already exists');
	}

	const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
	if (!driver) {
		throw new HttpError(404, 'Driver not found');
	}

	const settled = input.settled === true;

	return prisma.driverTrip.create({
		data: {
			id: tripId,
			driverId: input.driverId,
			driverName: normalize(input.driverName) || driver.name,
			date: parseDate(input.date),
			route: normalize(input.route),
			truckNo: normalize(input.truckNo) || driver.truckNo,
			amount: new Prisma.Decimal(input.amount),
			memo: normalize(input.memo),
			poId: normalize(input.poId),
			settled,
			settledAt: settled ? (input.settledAt ? parseDate(input.settledAt) : new Date()) : null
		}
	});
}

export async function updateDriverTrip(id: string, input: UpdateDriverTripInput) {
	const existing = await prisma.driverTrip.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Driver trip not found');
	}

	const settled = input.settled;

	return prisma.driverTrip.update({
		where: { id },
		data: {
			driverName: normalize(input.driverName),
			date: input.date ? parseDate(input.date) : undefined,
			route: normalize(input.route),
			truckNo: normalize(input.truckNo),
			amount: typeof input.amount === 'number' ? new Prisma.Decimal(input.amount) : undefined,
			memo: normalize(input.memo),
			poId: normalize(input.poId),
			settled,
			settledAt:
				settled === true
					? input.settledAt
						? parseDate(input.settledAt)
						: existing.settledAt || new Date()
					: settled === false
						? null
						: input.settledAt === null
							? null
							: input.settledAt
								? parseDate(input.settledAt)
								: undefined
		}
	});
}