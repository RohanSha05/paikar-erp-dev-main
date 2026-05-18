import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateDriverInput, UpdateDriverInput } from './module.types';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';

function normalize(value?: string) {
	return value?.trim() || undefined;
}

async function generateDriverId() {
	return nextDailySequenceIdForDelegate(prisma.driver, 'id', 'DRV');
}

export async function listDrivers() {
	const drivers = await prisma.driver.findMany({
		orderBy: { createdAt: 'desc' }
	});

	if (!drivers.length) return [];

	const driverIds = drivers.map((driver) => driver.id);
	const accounts = await prisma.account.findMany({
		where: {
			partyKind: 'driver',
			partyRefId: { in: driverIds },
		},
		select: {
			id: true,
			partyRefId: true,
			opening: true,
		},
	});

	const accountIds = accounts.map((account) => account.id);
	const ledgerSums = accountIds.length
		? await prisma.voucherRow.groupBy({
				by: ['accountId'],
				where: {
					accountId: { in: accountIds },
					voucher: { status: 'POSTED' },
				},
				_sum: {
					dr: true,
					cr: true,
				},
		  })
		: [];

	const ledgerByAccountId = new Map(
		ledgerSums.map((row) => [
			row.accountId,
			Number(row._sum.dr || 0) - Number(row._sum.cr || 0),
		]),
	);

	const accountByDriverId = new Map(
		accounts.map((account) => [account.partyRefId, account]),
	);

	return drivers.map((driver) => {
		const account = accountByDriverId.get(driver.id);
		const opening = Number(account?.opening || 0);
		const ledger = account ? Number(ledgerByAccountId.get(account.id) || 0) : 0;
		const balance = opening + ledger;
		const pawna = balance > 0 ? balance : 0;
		const dena = balance < 0 ? Math.abs(balance) : 0;

		return {
			...driver,
			balance,
			pawna,
			dena,
		};
	});
}

export async function createDriver(input: CreateDriverInput) {
	const id = normalize(input.id) || await generateDriverId();
	const exists = await prisma.driver.findUnique({ where: { id } });
	if (exists) {
		throw new HttpError(409, 'Driver ID already exists');
	}

	const driver = await prisma.driver.create({
		data: {
			id,
			name: input.name.trim(),
			phone: normalize(input.phone),
			truckNo: normalize(input.truckNo),
			licenseNo: normalize(input.licenseNo),
			active: input.active !== false
		}
	});

	await ensurePartyAccount({
		kind: 'driver',
		refId: driver.id,
		name: driver.name,
		type: 'party',
	});

	return driver;
}

export async function updateDriver(id: string, input: UpdateDriverInput) {
	const existing = await prisma.driver.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Driver not found');
	}

	const driver = await prisma.driver.update({
		where: { id },
		data: {
			name: input.name?.trim(),
			phone: normalize(input.phone),
			truckNo: normalize(input.truckNo),
			licenseNo: normalize(input.licenseNo),
			active: input.active
		}
	});

	await ensurePartyAccount({
		kind: 'driver',
		refId: driver.id,
		name: driver.name,
		type: 'party',
	});

	return driver;
}