// Upsert Party Account Opening for API route
// Accepts { partyKind, partyRefId, name, amount } from frontend and maps to CreateAccountInput
export async function upsertPartyAccountOpening(payload: {
  partyKind: string;
  partyRefId: string;
  name: string;
  paona?: number;
  dena?: number;
}): Promise<AccountDto> {
  return createAccount({
    name: payload.name,
    type: 'party',
    partyKind: payload.partyKind,
    partyRefId: payload.partyRefId,
    openingDr: payload.paona,
    openingCr: payload.dena,
    active: true,
  });
}
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { dhakaDayEnd, dhakaDayStart, tzDate, tzDateTime } from '../../common/utils/date';
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
		// opening: toNumber(account.opening),
	};
}

async function getOpeningFromVouchers(accountId: string, beforeDate?: Date) {
  const rows = await prisma.voucherRow.findMany({
    where: {
      accountId,
			voucher: {
				status: 'POSTED',
				...(beforeDate && { vdate: { lt: beforeDate } }),
			},
    },
    select: { dr: true, cr: true },
  });

  return rows.reduce(
    (sum, r) => sum + Number(r.dr) - Number(r.cr),
    0
  );
}



// async function getOpeningFromVouchers(accountId: string, beforeDate?: Date) {


// 	 if (!beforeDate) return 0;

// 	const rows = await prisma.voucherRow.findMany({
// 		where: {
// 			accountId,
// 			...(beforeDate && {
// 				voucher: {
// 					vdate: { lt: beforeDate },
// 				},
// 			}),
// 		},
// 		select: { dr: true, cr: true },
// 	});

// 	return rows.reduce(
// 		(sum, r) => sum + Number(r.dr) - Number(r.cr),
// 		0
// 	);
// }

export async function getReportMeta(): Promise<ReportMetaDto> {
	const latestVoucher = await prisma.voucher.findFirst({
    where: { status: 'POSTED' },
		orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
		select: { vdate: true },
	});

	if (!latestVoucher) {
		return {
			latestVoucherDate: null,
			latestVoucherYear: null,
		};
	}

	const latestDate = tzDate(latestVoucher.vdate);
	return {
		latestVoucherDate: latestDate,
		latestVoucherYear: latestVoucher.vdate.getFullYear(),
	};
}

async function fetchVouchers(startDate?: string, endDate?: string) {
	const where: Record<string, any> = {};

	if (startDate) {
		where.vdate = {
			...where.vdate,
			gte: dhakaDayStart(startDate),
		};
	}

	if (endDate) {
		where.vdate = {
			...where.vdate,
			lte: dhakaDayEnd(endDate),
		};
	}

	return prisma.voucher.findMany({
 		where: { ...where, status: 'POSTED' },
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

async function getDaybookOpening(dateISO: string) {
	const openingDate = dhakaDayStart(dateISO);
	const vouchers = await prisma.voucher.findMany({
		where: {
			status: 'POSTED',
			vdate: { lt: openingDate },
		},
		include: {
			rows: {
				select: { dr: true, cr: true },
			},
		},
		orderBy: [
			{ vdate: 'asc' },
			{ createdAt: 'asc' },
		],
	});

	const sideForVoucher = (vtype: string) => (vtype === 'payment' ? 'credit' : 'debit');

	return vouchers.reduce((sum, voucher) => {
		const debit = voucher.rows.reduce((rowSum, row) => rowSum + toNumber(row.dr), 0);
		const credit = voucher.rows.reduce((rowSum, row) => rowSum + toNumber(row.cr), 0);
		const amount = Math.max(debit, credit);
		return sideForVoucher(voucher.vtype) === 'debit' ? sum + amount : sum - amount;
	}, 0);
}

async function getCashbookOpening(dateISO: string) {
	const openingDate = dhakaDayStart(dateISO);
	const vouchers = await prisma.voucher.findMany({
		where: {
			status: 'POSTED',
			vdate: { lt: openingDate },
		},
		include: {
			rows: {
				include: {
					account: true,
				},
			},
		},
		orderBy: [
			{ vdate: 'asc' },
			{ createdAt: 'asc' },
		],
	});

	const sideForVoucher = (vtype: string) => (vtype === 'payment' ? 'credit' : 'debit');

	return vouchers.reduce((sum, voucher) => {
		// Filter to only bank and cash accounts
		const instrumentRows = voucher.rows.filter((row) => row.account && (row.account.type === 'bank' || row.account.type === 'cash'));
		const debit = instrumentRows.reduce((rowSum, row) => rowSum + toNumber(row.dr), 0);
		const credit = instrumentRows.reduce((rowSum, row) => rowSum + toNumber(row.cr), 0);
		const amount = Math.max(debit, credit);
		return sideForVoucher(voucher.vtype) === 'debit' ? sum + amount : sum - amount;
	}, 0);
}

export async function listAccounts(filterByType?: string): Promise<AccountDto[]> {
	const accounts = await prisma.account.findMany({
		where: {
			active: true,
			...(filterByType ? { type: filterByType } : {}),
		},
		orderBy: [{ type: 'asc' }, { name: 'asc' }],
	});

	const result = await Promise.all(
		accounts.map(async (acc) => {
			const opening = await getOpeningFromVouchers(acc.id);
			const openingDr = opening > 0 ? opening : 0;
			const openingCr = opening < 0 ? Math.abs(opening) : 0;

			return {
				...mapAccount(acc),
				opening,
				openingDr,
				openingCr,
			};
		})
	);

	return result;
}

// export async function createAccount(input: CreateAccountInput): Promise<AccountDto> {
// 	const code = (input.code || (await generateAccountCode(input.type))).trim().toUpperCase();
// 	const exists = await prisma.account.findUnique({ where: { code } });
// 	if (exists) {
// 		throw new HttpError(409, 'Account code already exists');
// 	}

// 	const account = await prisma.account.create({
// 		data: {
// 			code,
// 			name: input.name.trim(),
// 			type: input.type.trim(),
// 			opening: input.opening !== undefined ? new Prisma.Decimal(input.opening) : undefined,
// 			active: input.active !== false,
// 			partyKind: input.partyKind?.trim() || undefined,
// 			partyRefId: input.partyRefId?.trim() || undefined,
// 			bankInfo: input.bankInfo?.trim() || undefined,
// 		},
// 	});

// 	return mapAccount(account);
// }

function partyBalanceSide(partyKind?: string) {
  const kind = partyKind?.trim().toLowerCase();

  switch (kind) {
    case "customer":
    case "driver":
      return "debit"; // paona

    case "seller":
      return "credit"; // dena

    case "investor":
      return "credit"; // capital

    default:
      return "debit";
  }
}

type OpeningSide = 'dr' | 'cr';

function coerceAmount(value?: number | null) {
	const amount = Number(value ?? 0);
	return Number.isFinite(amount) ? amount : 0;
} 

function defaultOpeningSide(type: string, partyKind?: string): OpeningSide {
	const normalizedType = normalizeType(type);

	if (normalizedType === 'party') {
		return partyBalanceSide(partyKind) === 'credit' ? 'cr' : 'dr';
	}

	if (['cash', 'bank', 'expense', 'transport'].includes(normalizedType)) {
		return 'dr';
	}

	return 'cr';
}

function normalizeOpening(input: CreateAccountInput) {
	const openingDr = coerceAmount(input.openingDr);
	const openingCr = coerceAmount(input.openingCr);

	if (openingDr > 0 && openingCr > 0) {
		throw new HttpError(400, 'Only one opening balance side is allowed');
	}

	if (openingDr > 0) {
		return { amount: openingDr, side: 'dr' as const };
	}

	if (openingCr > 0) {
		return { amount: openingCr, side: 'cr' as const };
	}

	const opening = coerceAmount(input.opening);
	if (opening === 0) {
		return null;
	}

	const side = opening < 0
		? (defaultOpeningSide(input.type, input.partyKind) === 'dr' ? 'cr' : 'dr')
		: defaultOpeningSide(input.type, input.partyKind);

	return {
		amount: Math.abs(opening),
		side,
	};
}

async function deleteOpeningVouchers(
	tx: Prisma.TransactionClient,
	accountId: string,
) {
	// Find all vouchers that have this account with opening balance narration
	const vouchersToDelete = await tx.voucher.findMany({
		where: {
			narration: {
				startsWith: 'Opening balance —',
			},
			rows: {
				some: {
					accountId,
				},
			},
		},
		select: { id: true },
	});

	// Delete rows for these vouchers
	if (vouchersToDelete.length > 0) {
		const voucherIds = vouchersToDelete.map((v) => v.id);
		await tx.voucherRow.deleteMany({
			where: {
				voucherId: {
					in: voucherIds,
				},
			},
		});

		// Delete the vouchers
		await tx.voucher.deleteMany({
			where: {
				id: {
					in: voucherIds,
				},
			},
		});
	}
}

async function postOpeningVoucher(
	tx: Prisma.TransactionClient,
	account: { id: string; name: string },
	opening: { amount: number; side: OpeningSide },
) {
	const equityAccount = await tx.account.upsert({
		where: { code: 'AC-OPENING-EQUITY' },
		update: {},
		create: {
			code: 'AC-OPENING-EQUITY',
			name: 'Opening Balance Equity',
			type: 'equity',
			active: true,
		},
	});

	const voucherNo = await nextDailySequenceIdForDelegate(
		tx.voucher,
		'voucherNo',
		'VCH'
	);

	const accountRow = opening.side === 'dr'
		? {
				accountId: account.id,
				dr: new Prisma.Decimal(opening.amount),
				cr: new Prisma.Decimal(0),
				memo: 'Opening balance',
			}
		: {
				accountId: account.id,
				dr: new Prisma.Decimal(0),
				cr: new Prisma.Decimal(opening.amount),
				memo: 'Opening balance',
			};

	const equityRow = opening.side === 'dr'
		? {
				accountId: equityAccount.id,
				dr: new Prisma.Decimal(0),
				cr: new Prisma.Decimal(opening.amount),
				memo: 'Opening balance',
			}
		: {
				accountId: equityAccount.id,
				dr: new Prisma.Decimal(opening.amount),
				cr: new Prisma.Decimal(0),
				memo: 'Opening balance',
			};

	console.log('🔍 Creating opening balance voucher:', {
		accountName: account.name,
		amount: opening.amount,
		side: opening.side,
		rows: [
			{ dr: accountRow.dr, cr: accountRow.cr },
			{ dr: equityRow.dr, cr: equityRow.cr },
		],
	});

	await tx.voucher.create({
		data: {
			voucherNo,
			vtype: 'journal',
			vdate: new Date(),
			narration: `Opening balance — ${account.name}`,
			rows: {
				create: [accountRow, equityRow],
			},
			status: 'POSTED'
		},
	});
}

export async function createAccount(input: CreateAccountInput): Promise<AccountDto> {
  const code = (input.code || (await generateAccountCode(input.type))).trim().toUpperCase();
  const partyKind = input.partyKind?.trim().toLowerCase();
	const normalizedType = normalizeType(input.type);
	const opening = normalizeOpening(input);
	const name = input.name.trim();
	const partyRefId = input.partyRefId?.trim();

	if (normalizedType === 'party' && partyKind && partyRefId) {
    const existing = await prisma.account.findFirst({
      where: {
        type: 'party',
        partyKind: partyKind,
				partyRefId,
      },
    });

    if (existing) {
			return prisma.$transaction(async (tx) => {
				const account = await tx.account.update({
					where: { id: existing.id },
					data: {
						name,
						type: normalizedType,
						active: input.active !== false,
						partyKind,
						partyRefId,
						bankInfo: input.bankInfo?.trim() || undefined,
					},
				});

				if (opening) {
					// Delete old opening vouchers before posting new one
					await deleteOpeningVouchers(tx, existing.id);
					await postOpeningVoucher(tx, account, opening);
				}

				return mapAccount(account);
			});
    }
  }

	const exists = await prisma.account.findUnique({ where: { code } });
	if (exists) throw new HttpError(409, 'Account code already exists');

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        code,
				name,
				type: normalizedType,
        opening: new Prisma.Decimal(0),
        active: input.active !== false,
        partyKind: partyKind || undefined,
				partyRefId: partyRefId || undefined,
        bankInfo: input.bankInfo?.trim() || undefined,
      },
    });

		if (opening) {
			await postOpeningVoucher(tx, account, opening);
		}


    return mapAccount(account);
  });
}

export async function getDaybook(dateISO: string) {
	const vouchers = await fetchVouchers(dateISO, dateISO);
	const opening = await getDaybookOpening(dateISO);
	const daybookSide = (voucher: { vtype: string; narration?: string | null }) => {
		if (voucher.vtype === 'payment') {
			return 'credit';
		}

		if (voucher.vtype === 'journal' && (voucher.narration || '').includes('PO-')) {
			return 'credit';
		}

		return 'debit';
	};
	const list = vouchers.map((voucher) => {
		// Filter out rows with party accounts
		const nonPartyRows = voucher.rows.filter((row) => row.account && row.account.type !== 'party');
		
		const debit = nonPartyRows.reduce((sum, row) => sum + toNumber(row.dr), 0);
		const credit = nonPartyRows.reduce((sum, row) => sum + toNumber(row.cr), 0);
		const amount = Math.max(debit, credit);
		const side = daybookSide(voucher);
		return {
			id: voucher.id,
			voucherNo: voucher.voucherNo,
			vtype: voucher.vtype,
			vdate: tzDate(voucher.vdate),
			narration: voucher.narration,
			rows: nonPartyRows.map((row) => ({
				id: row.id,
				accountId: row.accountId,
				account: row.account ? mapAccount(row.account) : undefined,
				dr: toNumber(row.dr),
				cr: toNumber(row.cr),
				memo: row.memo,
			})),
			debit: side === 'debit' ? amount : 0,
			credit: side === 'credit' ? amount : 0,
		};
	});
	const totals = {
		debit: list.reduce((sum, item) => sum + item.debit, 0),
		credit: list.reduce((sum, item) => sum + item.credit, 0),
	};
	const closing = opening + totals.debit - totals.credit;

	return {
		opening,
		closing,
		list,
		totals,
	};
}

export async function getCashbook(dateISO: string) {
	const vouchers = await fetchVouchers(dateISO, dateISO);
	const opening = await getCashbookOpening(dateISO);
	const daybookSide = (vtype: string) => (vtype === 'payment' ? 'credit' : 'debit');
	const list = vouchers
		.map((voucher) => {
		// Filter to only bank and cash accounts
		const instrumentRows = voucher.rows.filter((row) => row.account && (row.account.type === 'bank' || row.account.type === 'cash'));
		if (!instrumentRows.length) {
			return null;
		}
		
		const debit = instrumentRows.reduce((sum, row) => sum + toNumber(row.dr), 0);
		const credit = instrumentRows.reduce((sum, row) => sum + toNumber(row.cr), 0);
		const amount = Math.max(debit, credit);
		const side = daybookSide(voucher.vtype);
		return {
			id: voucher.id,
			voucherNo: voucher.voucherNo,
			vtype: voucher.vtype,
			vdate: tzDate(voucher.vdate),
			narration: voucher.narration,
			rows: instrumentRows.map((row) => ({
				id: row.id,
				accountId: row.accountId,
				account: row.account ? mapAccount(row.account) : undefined,
				dr: toNumber(row.dr),
				cr: toNumber(row.cr),
				memo: row.memo,
			})),
			debit: side === 'debit' ? amount : 0,
			credit: side === 'credit' ? amount : 0,
		};
		})
		.filter((voucher): voucher is NonNullable<typeof voucher> => voucher !== null);
	const totals = {
		debit: list.reduce((sum, item) => sum + item.debit, 0),
		credit: list.reduce((sum, item) => sum + item.credit, 0),
	};
	const closing = opening + totals.debit - totals.credit;

	return {
		opening,
		closing,
		list,
		totals,
	};
}

export async function getLedger(accountId: string, from?: string, to?: string): Promise<LedgerReportDto> {
	const account = await prisma.account.findUnique({ where: { id: accountId } });
	if (!account) {
		throw new HttpError(404, 'Account not found');
	}

	const openingDate = from ? dhakaDayStart(from) : undefined;
	const closingDate = to ? dhakaDayEnd(to) : undefined;

	// Only calculate opening if a from date is provided
	// If no from date, opening is implicit in the vouchers query
	const opening = openingDate ? await getOpeningFromVouchers(accountId, openingDate) : 0;

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
		voucher.rows.length ?
		voucher.rows.map((row) => {
			balance += toNumber(row.dr) - toNumber(row.cr);
			return {
				vId: voucher.voucherNo,
				date: tzDate(voucher.vdate),
				memo: row.memo || voucher.narration || undefined,
				dr: toNumber(row.dr),
				cr: toNumber(row.cr),
				balance,
				createdAt: tzDateTime(row.createdAt), 
			};
		}): [],
	);

	return {
		account: mapAccount(account),
		opening,
		closing: balance,
		rows: rows,
	};
}

export async function getTrialBalance(): Promise<TrialBalanceDto> {
	const accounts = await prisma.account.findMany({
		where: { active: true },
		orderBy: [{ type: 'asc' }, { name: 'asc' }],
	});

	const vouchers = await prisma.voucher.findMany({
		where: { status: 'POSTED' },
		include: { rows: true },
		orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
	});

	const rows = await Promise.all(
	accounts.map(async (account) => {
		let dr = 0;
		let cr = 0;

		for (const voucher of vouchers) {
			for (const row of voucher.rows.filter(
				(entry) => entry.accountId === account.id
			)) {
				dr += toNumber(row.dr);
				cr += toNumber(row.cr);
			}
		}

		const opening = await getOpeningFromVouchers(account.id);
		const balance = dr - cr;

		return {
			id: account.id,
			code: account.code,
			name: account.name,
			type: account.type,
			opening : 0,
			dr,
			cr,
			balance,
		};
	})
);

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
		year = meta.latestVoucherYear ?? new Date().getFullYear();
	}

	const start = dhakaDayStart(`${year}-01-01`);
	const end = dhakaDayEnd(`${year}-12-31`);
	const vouchers = await prisma.voucher.findMany({
		where: {
			vdate: { gte: start, lte: end },
			status: 'POSTED',
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
