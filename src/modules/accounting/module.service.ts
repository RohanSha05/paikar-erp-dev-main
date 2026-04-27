import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import type {
	AccountDto,
	CreateAccountInput,
	LedgerReportDto,
	TrialBalanceDto,
	ExpenseMonthSummaryDto,
	ReportMetaDto,
} from './module.types';

function toNumber(value: Prisma.Decimal | number | null | undefined) {
	return value ? Number(value) : 0;
}

function normalizeType(value: string) {
	return value.trim().toLowerCase();
}

function slugify(value: string) {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 20);
}

function accountTypeTag(type: string) {
	const tag = slugify(type || 'GEN').slice(0, 6);
	return tag || 'GEN';
}

async function generateAccountCode(type: string) {
	return nextDailySequenceIdForDelegate(
		prisma.account,
		'code',
		`AC-${accountTypeTag(type)}`,
	);
}

function mapAccount(account: any): AccountDto {
	return {
		id: account.id,
		code: account.code,
		name: account.name,
		type: account.type,
		active: account.active,
		partyKind: account.partyKind,
		partyRefId : account.partyRefId,
		opening: toNumber(account.opening),
	};
}

export async function getReportMeta(): Promise<ReportMetaDto> {
	const latestVoucher = await prisma.voucher.findFirst({
		orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
		select: { vdate: true },
	});

	if (!latestVoucher) {
		return {
			latestVoucherDate: null,
			latestVoucherYear: null,
		};
	}

	const latestDate = latestVoucher.vdate.toISOString().slice(0, 10);
	return {
		latestVoucherDate: latestDate,
		latestVoucherYear: latestVoucher.vdate.getUTCFullYear(),
	};
}

async function fetchVouchers(startDate?: string, endDate?: string) {
	const where: Record<string, any> = {};

	if (startDate) {
		where.vdate = {
			...where.vdate,
			gte: new Date(`${startDate}T00:00:00Z`),
		};
	}

	if (endDate) {
		where.vdate = {
			...where.vdate,
			lte: new Date(`${endDate}T23:59:59Z`),
		};
	}

	return prisma.voucher.findMany({
		where,
		include: {
			rows: {
				include: {
					account: true,
				},
			},
		},
		orderBy: [
			{ vdate: 'desc' },
			{ createdAt: 'desc' },
		],
	});
}

export async function listAccounts(filterByType?: string): Promise<AccountDto[]> {
	const accounts = await prisma.account.findMany({
		where: {
			active: true,
			...(filterByType ? { type: filterByType } : {}),
		},
		orderBy: [{ type: 'asc' }, { name: 'asc' }],
	});

	return accounts.map(mapAccount);
}

export async function createAccount(input: CreateAccountInput): Promise<AccountDto> {
	const code = (input.code || (await generateAccountCode(input.type))).trim().toUpperCase();
	const exists = await prisma.account.findUnique({ where: { code } });
	if (exists) {
		throw new HttpError(409, 'Account code already exists');
	}

	const account = await prisma.account.create({
		data: {
			code,
			name: input.name.trim(),
			type: input.type.trim(),
			opening: input.opening !== undefined ? new Prisma.Decimal(input.opening) : undefined,
			active: input.active !== false,
			partyKind: input.partyKind?.trim() || undefined,
			partyRefId: input.partyRefId?.trim() || undefined,
			bankInfo: input.bankInfo?.trim() || undefined,
		},
	});

	return mapAccount(account);
}

export async function getDaybook(dateISO: string) {
	const vouchers = await fetchVouchers(dateISO, dateISO);
	const list = vouchers.map((voucher) => {
		const debit = voucher.rows.reduce((sum, row) => sum + toNumber(row.dr), 0);
		const credit = voucher.rows.reduce((sum, row) => sum + toNumber(row.cr), 0);
		return {
			id: voucher.id,
			voucherNo: voucher.voucherNo,
			vtype: voucher.vtype,
			vdate: voucher.vdate.toISOString().slice(0, 10),
			narration: voucher.narration,
			rows: voucher.rows.map((row) => ({
				id: row.id,
				accountId: row.accountId,
				account: row.account ? mapAccount(row.account) : undefined,
				dr: toNumber(row.dr),
				cr: toNumber(row.cr),
				memo: row.memo,
			})),
			debit,
			credit,
		};
	});

	return {
		list,
		totals: {
			debit: list.reduce((sum, item) => sum + item.debit, 0),
			credit: list.reduce((sum, item) => sum + item.credit, 0),
		},
	};
}

export async function getLedger(accountId: string, from?: string, to?: string): Promise<LedgerReportDto> {
	const account = await prisma.account.findUnique({ where: { id: accountId } });
	if (!account) {
		throw new HttpError(404, 'Account not found');
	}

	const openingDate = from ? new Date(`${from}T00:00:00Z`) : undefined;
	const closingDate = to ? new Date(`${to}T23:59:59Z`) : undefined;

	const openingVouchers = openingDate
		? await prisma.voucher.findMany({
				where: { vdate: { lt: openingDate } },
				include: {
					rows: {
						where: { accountId },
					},
				},
		  })
		: [];

	const opening = toNumber(account.opening) + openingVouchers.reduce((sum, voucher) => {
		return sum + voucher.rows.reduce((rowSum, row) => rowSum + toNumber(row.dr) - toNumber(row.cr), 0);
	}, 0);

	const vouchers = await prisma.voucher.findMany({
		where: {
			...(openingDate || closingDate
				? {
					vdate: {
						...(openingDate ? { gte: openingDate } : {}),
						...(closingDate ? { lte: closingDate } : {}),
					},
				}
				: {}),
		},
		include: {
			rows: {
				where: { accountId },
			},
		},
		orderBy: [
			{ vdate: 'asc' },
			{ createdAt: 'asc' },
		],
	});

	let balance = opening;
	const rows = vouchers.flatMap((voucher) =>
		voucher.rows.map((row) => {
			balance += toNumber(row.dr) - toNumber(row.cr);
			return {
				vId: voucher.voucherNo,
				date: voucher.vdate.toISOString().slice(0, 10),
				memo: row.memo || voucher.narration || undefined,
				dr: toNumber(row.dr),
				cr: toNumber(row.cr),
				balance,
				createdAt: row.createdAt.toISOString(), 
			};
		}),
	);

	return {
		account: mapAccount(account),
		opening,
		closing: balance,
		rows: rows.reverse(),
	};
}

export async function getTrialBalance(): Promise<TrialBalanceDto> {
	const accounts = await prisma.account.findMany({
		where: { active: true },
		orderBy: [{ type: 'asc' }, { name: 'asc' }],
	});

	const vouchers = await prisma.voucher.findMany({
		include: { rows: true },
		orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
	});

	const rows = accounts.map((account) => {
		let dr = 0;
		let cr = 0;
		for (const voucher of vouchers) {
			for (const row of voucher.rows.filter((entry) => entry.accountId === account.id)) {
				dr += toNumber(row.dr);
				cr += toNumber(row.cr);
			}
		}

		const opening = toNumber(account.opening);
		const balance = opening + dr - cr;
		return {
			id: account.id,
			code: account.code,
			name: account.name,
			type: account.type,
			opening,
			dr,
			cr,
			balance,
		};
	});

	return {
		rows,
		totals: {
			dr: rows.reduce((sum, row) => sum + row.dr, 0),
			cr: rows.reduce((sum, row) => sum + row.cr, 0),
		},
	};
}

export async function getExpenseSummary(year: number): Promise<ExpenseMonthSummaryDto[]> {
	if (!Number.isFinite(year)) {
		const meta = await getReportMeta();
		year = meta.latestVoucherYear ?? new Date().getUTCFullYear();
	}

	const start = new Date(`${year}-01-01T00:00:00Z`);
	const end = new Date(`${year}-12-31T23:59:59Z`);
	const vouchers = await prisma.voucher.findMany({
		where: {
			vdate: { gte: start, lte: end },
		},
		include: {
			rows: {
				include: { account: true },
			},
		},
		orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
	});

	const months = Array.from({ length: 12 }, (_, index) => ({
		month: index + 1,
		fixed: 0,
		variable: 0,
		total: 0,
	}));

	for (const voucher of vouchers) {
		const monthIndex = voucher.vdate.getMonth();
		const expenseAmount = voucher.rows.reduce((sum, row) => {
			const type = normalizeType(row.account?.type || '');

			const isDriverAccount = row.account?.partyKind === 'driver';

			if (
			type !== 'expense' &&
			type !== 'transport' &&
			!isDriverAccount
			) {
			return sum;
			}
			return sum + toNumber(row.dr);
		}, 0);

		if (expenseAmount <= 0) {
			continue;
		}

		months[monthIndex].total += expenseAmount;
		if (voucher.voucherNo.startsWith('RC-') || (voucher.narration || '').toLowerCase().includes('recurring')) {
			months[monthIndex].fixed += expenseAmount;
		} else {
			months[monthIndex].variable += expenseAmount;
		}
	}

	return months;
}
