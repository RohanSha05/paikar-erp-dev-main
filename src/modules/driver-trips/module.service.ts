import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateDriverTripInput, UpdateDriverTripInput } from './module.types';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { parseDhakaDate } from '../../common/utils/date';
import { formatVoucherNarration } from '../../common/utils/voucher-narration';

function normalize(value?: string | null) {
	if (value === null) return null;
	return value?.trim() || undefined;
}

async function generateTripId() {
	return nextDailySequenceIdForDelegate(prisma.driverTrip, 'id', 'TRIP');
}

async function generateVoucherNo(tx: Prisma.TransactionClient, date: Date) {
	return nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', date);
}

function parseDate(value: string) {
	const d = parseDhakaDate(value);
	if (Number.isNaN(d.getTime())) {
		throw new HttpError(400, 'Invalid trip date');
	}
	return d;
}

async function resolveRowAccountIds(
	tx: Prisma.TransactionClient,
	rows: Array<{ accountId: string; dr?: Prisma.Decimal | number; cr?: Prisma.Decimal | number; memo?: string }>,
) {
	const requested = [...new Set(rows.map((row) => row.accountId))];
	const accounts = await tx.account.findMany({
		where: {
			OR: [{ id: { in: requested } }, { code: { in: requested } }],
		},
		select: { id: true, code: true },
	});

	const idByAnyKey = new Map<string, string>();
	for (const account of accounts) {
		idByAnyKey.set(account.id, account.id);
		idByAnyKey.set(account.code, account.id);
	}

	return rows.map((row) => {
		const resolved = idByAnyKey.get(row.accountId);
		if (!resolved) {
			throw new HttpError(404, `Account not found: ${row.accountId}`);
		}

		return {
			...row,
			accountId: resolved,
		};
	});
}

async function postTripVoucher(
	tx: Prisma.TransactionClient,
	trip: {
		id: string;
		driverId: string;
		driverName?: string | null;
		date: Date;
		amount: Prisma.Decimal;
	},
	options?: {
		payAccountId?: string;
		payNowAmount?: number;
		memo?: string;
	},
) {
	const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });
	if (!driver) {
		throw new HttpError(404, 'Driver not found');
	}

	const driverAccount = await ensurePartyAccount({
		kind: 'driver',
		refId: driver.id,
		name: driver.name,
		type: 'party',
	});

	const tripAmount = Number(trip.amount || 0);
	const payNowAmount = Number(options?.payNowAmount || 0);
	const rows: Array<{ accountId: string; dr?: Prisma.Decimal | number; cr?: Prisma.Decimal | number; memo?: string }> = [];

	if (options?.payAccountId && payNowAmount > 0) {
		rows.push({
			accountId: driverAccount.id,
			dr: payNowAmount,
			memo: `${options.memo || trip.driverName || driver.name} pay`,
		});
		rows.push({
			accountId: options.payAccountId,
			cr: payNowAmount,
			memo: `${options.memo || trip.driverName || driver.name} pay`,
		});
	}

	if (tripAmount > 0) {
		rows.push({
			accountId: 'AC-TRANSPORT',
			dr: tripAmount,
			memo: options?.memo || trip.driverName || driver.name,
		});
		rows.push({
			accountId: driverAccount.id,
			cr: tripAmount,
			memo: options?.memo || trip.driverName || driver.name,
		});
	}

	if (!rows.length) {
		return null;
	}

	const resolvedRows = await resolveRowAccountIds(tx, rows);

	const voucher = await tx.voucher.create({
		data: {
			voucherNo: await generateVoucherNo(tx, trip.date),
			vtype: 'journal',
			vdate: trip.date,
			narration: formatVoucherNarration('Driver trip', trip.driverName || driver.name, options?.memo),
			status: 'POSTED'
		},
	});

	await tx.voucherRow.createMany({
		data: resolvedRows.map((row) => ({
			voucherId: voucher.id,
			accountId: row.accountId,
			dr: new Prisma.Decimal(row.dr || 0),
			cr: new Prisma.Decimal(row.cr || 0),
			memo: row.memo,
		})),
	});

	return voucher;
}

export async function listDriverTrips() {
	return prisma.driverTrip.findMany({
		orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
	});
}

export async function createDriverTrip(input: CreateDriverTripInput) {
	const tripId = normalize(input.id) || await generateTripId();
	const existing = await prisma.driverTrip.findUnique({ where: { id: tripId } });
	if (existing) {
		throw new HttpError(409, 'Trip ID already exists');
	}

	const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
	if (!driver) {
		throw new HttpError(404, 'Driver not found');
	}

	const settledRequested = input.settled === true;

	const trip = await prisma.driverTrip.create({
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
			settled: false,
			settledAt: null,
		}
	});

	if (settledRequested) {
		return settleDriverTrip(
			trip.id,
			input.settledAt
				? { settledAt: input.settledAt, memo: normalize(input.memo) || undefined }
				: { memo: normalize(input.memo) || undefined },
		);
	}

	return trip;
}

export async function updateDriverTrip(id: string, input: UpdateDriverTripInput) {
	const existing = await prisma.driverTrip.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Driver trip not found');
	}

	const trip = await prisma.driverTrip.update({
		where: { id },
		data: {
			driverName: normalize(input.driverName),
			date: input.date ? parseDate(input.date) : undefined,
			route: normalize(input.route),
			truckNo: normalize(input.truckNo),
			amount: typeof input.amount === 'number' ? new Prisma.Decimal(input.amount) : undefined,
			memo: normalize(input.memo),
			poId: normalize(input.poId),
			settled: existing.settled,
			settledAt: existing.settledAt
		}
	});

	if (input.settled === true && !existing.settled) {
		return settleDriverTrip(
			trip.id,
			input.settledAt
				? { settledAt: input.settledAt, memo: normalize(input.memo) || undefined }
				: { memo: normalize(input.memo) || undefined },
		);
	}

	return trip;
}

export async function settleDriverTrip(
	tripId: string,
	options?: {
		payAccountId?: string;
		payNowAmount?: number;
		memo?: string;
		settledAt?: string | null;
	},
) {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.driverTrip.findUnique({ where: { id: tripId } });
		if (!existing) {
			throw new HttpError(404, 'Driver trip not found');
		}

		if (existing.settled) {
			return existing;
		}

		const voucher = await postTripVoucher(tx, existing, options);
		if (!voucher) {
			return existing;
		}

		return tx.driverTrip.update({
			where: { id: tripId },
			data: {
				settled: true,
				settledAt: options?.settledAt ? parseDate(options.settledAt) : new Date(),
			},
		});
	});
}