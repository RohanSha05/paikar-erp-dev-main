"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPartyAccountOpening = upsertPartyAccountOpening;
exports.getReportMeta = getReportMeta;
exports.listAccounts = listAccounts;
exports.createAccount = createAccount;
exports.getDaybook = getDaybook;
exports.getLedger = getLedger;
exports.getTrialBalance = getTrialBalance;
exports.getExpenseSummary = getExpenseSummary;
// Upsert Party Account Opening for API route
// Accepts { partyKind, partyRefId, name, amount } from frontend and maps to CreateAccountInput
function upsertPartyAccountOpening(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        return createAccount({
            name: payload.name,
            type: 'party',
            partyKind: payload.partyKind,
            partyRefId: payload.partyRefId,
            openingDr: payload.paona,
            openingCr: payload.dena,
            active: true,
        });
    });
}
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const sequence_id_1 = require("../../common/utils/sequence-id");
function toNumber(value) {
    return value ? Number(value) : 0;
}
function normalizeType(value) {
    return value.trim().toLowerCase();
}
function slugify(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 20);
}
function accountTypeTag(type) {
    const tag = slugify(type || 'GEN').slice(0, 6);
    return tag || 'GEN';
}
function generateAccountCode(type) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.account, 'code', `AC-${accountTypeTag(type)}`);
    });
}
function mapAccount(account) {
    return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        active: account.active,
        partyKind: account.partyKind,
        partyRefId: account.partyRefId,
        // opening: toNumber(account.opening),
    };
}
function getOpeningFromVouchers(accountId, beforeDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const rows = yield prisma_1.prisma.voucherRow.findMany({
            where: Object.assign({ accountId }, (beforeDate && {
                voucher: { vdate: { lt: beforeDate } },
            })),
            select: { dr: true, cr: true },
        });
        return rows.reduce((sum, r) => sum + Number(r.dr) - Number(r.cr), 0);
    });
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
function getReportMeta() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestVoucher = yield prisma_1.prisma.voucher.findFirst({
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
    });
}
function fetchVouchers(startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = {};
        if (startDate) {
            where.vdate = Object.assign(Object.assign({}, where.vdate), { gte: new Date(`${startDate}T00:00:00Z`) });
        }
        if (endDate) {
            where.vdate = Object.assign(Object.assign({}, where.vdate), { lte: new Date(`${endDate}T23:59:59Z`) });
        }
        return prisma_1.prisma.voucher.findMany({
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
    });
}
function listAccounts(filterByType) {
    return __awaiter(this, void 0, void 0, function* () {
        const accounts = yield prisma_1.prisma.account.findMany({
            where: Object.assign({ active: true }, (filterByType ? { type: filterByType } : {})),
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        const result = yield Promise.all(accounts.map((acc) => __awaiter(this, void 0, void 0, function* () {
            const opening = yield getOpeningFromVouchers(acc.id);
            const openingDr = opening > 0 ? opening : 0;
            const openingCr = opening < 0 ? Math.abs(opening) : 0;
            return Object.assign(Object.assign({}, mapAccount(acc)), { opening,
                openingDr,
                openingCr });
        })));
        return result;
    });
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
function partyBalanceSide(partyKind) {
    const kind = partyKind === null || partyKind === void 0 ? void 0 : partyKind.trim().toLowerCase();
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
function coerceAmount(value) {
    const amount = Number(value !== null && value !== void 0 ? value : 0);
    return Number.isFinite(amount) ? amount : 0;
}
function defaultOpeningSide(type, partyKind) {
    const normalizedType = normalizeType(type);
    if (normalizedType === 'party') {
        return partyBalanceSide(partyKind) === 'credit' ? 'cr' : 'dr';
    }
    if (['cash', 'bank', 'expense', 'transport'].includes(normalizedType)) {
        return 'dr';
    }
    return 'cr';
}
function normalizeOpening(input) {
    const openingDr = coerceAmount(input.openingDr);
    const openingCr = coerceAmount(input.openingCr);
    if (openingDr > 0 && openingCr > 0) {
        throw new httpError_1.HttpError(400, 'Only one opening balance side is allowed');
    }
    if (openingDr > 0) {
        return { amount: openingDr, side: 'dr' };
    }
    if (openingCr > 0) {
        return { amount: openingCr, side: 'cr' };
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
function deleteOpeningVouchers(tx, accountId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find all vouchers that have this account with opening balance narration
        const vouchersToDelete = yield tx.voucher.findMany({
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
            yield tx.voucherRow.deleteMany({
                where: {
                    voucherId: {
                        in: voucherIds,
                    },
                },
            });
            // Delete the vouchers
            yield tx.voucher.deleteMany({
                where: {
                    id: {
                        in: voucherIds,
                    },
                },
            });
        }
    });
}
function postOpeningVoucher(tx, account, opening) {
    return __awaiter(this, void 0, void 0, function* () {
        const equityAccount = yield tx.account.upsert({
            where: { code: 'AC-OPENING-EQUITY' },
            update: {},
            create: {
                code: 'AC-OPENING-EQUITY',
                name: 'Opening Balance Equity',
                type: 'equity',
                active: true,
            },
        });
        const voucherNo = yield (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH');
        const accountRow = opening.side === 'dr'
            ? {
                accountId: account.id,
                dr: new client_1.Prisma.Decimal(opening.amount),
                cr: new client_1.Prisma.Decimal(0),
                memo: 'Opening balance',
            }
            : {
                accountId: account.id,
                dr: new client_1.Prisma.Decimal(0),
                cr: new client_1.Prisma.Decimal(opening.amount),
                memo: 'Opening balance',
            };
        const equityRow = opening.side === 'dr'
            ? {
                accountId: equityAccount.id,
                dr: new client_1.Prisma.Decimal(0),
                cr: new client_1.Prisma.Decimal(opening.amount),
                memo: 'Opening balance',
            }
            : {
                accountId: equityAccount.id,
                dr: new client_1.Prisma.Decimal(opening.amount),
                cr: new client_1.Prisma.Decimal(0),
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
        yield tx.voucher.create({
            data: {
                voucherNo,
                vtype: 'journal',
                vdate: new Date(),
                narration: `Opening balance — ${account.name}`,
                rows: {
                    create: [accountRow, equityRow],
                },
            },
        });
    });
}
function createAccount(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const code = (input.code || (yield generateAccountCode(input.type))).trim().toUpperCase();
        const partyKind = (_a = input.partyKind) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
        const normalizedType = normalizeType(input.type);
        const opening = normalizeOpening(input);
        const name = input.name.trim();
        const partyRefId = (_b = input.partyRefId) === null || _b === void 0 ? void 0 : _b.trim();
        if (normalizedType === 'party' && partyKind && partyRefId) {
            const existing = yield prisma_1.prisma.account.findFirst({
                where: {
                    type: 'party',
                    partyKind: partyKind,
                    partyRefId,
                },
            });
            if (existing) {
                return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const account = yield tx.account.update({
                        where: { id: existing.id },
                        data: {
                            name,
                            type: normalizedType,
                            active: input.active !== false,
                            partyKind,
                            partyRefId,
                            bankInfo: ((_a = input.bankInfo) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
                        },
                    });
                    if (opening) {
                        // Delete old opening vouchers before posting new one
                        yield deleteOpeningVouchers(tx, existing.id);
                        yield postOpeningVoucher(tx, account, opening);
                    }
                    return mapAccount(account);
                }));
            }
        }
        const exists = yield prisma_1.prisma.account.findUnique({ where: { code } });
        if (exists)
            throw new httpError_1.HttpError(409, 'Account code already exists');
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const account = yield tx.account.create({
                data: {
                    code,
                    name,
                    type: normalizedType,
                    opening: new client_1.Prisma.Decimal(0),
                    active: input.active !== false,
                    partyKind: partyKind || undefined,
                    partyRefId: partyRefId || undefined,
                    bankInfo: ((_a = input.bankInfo) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
                },
            });
            if (opening) {
                yield postOpeningVoucher(tx, account, opening);
            }
            return mapAccount(account);
        }));
    });
}
function getDaybook(dateISO) {
    return __awaiter(this, void 0, void 0, function* () {
        const vouchers = yield fetchVouchers(dateISO, dateISO);
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
    });
}
function getLedger(accountId, from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield prisma_1.prisma.account.findUnique({ where: { id: accountId } });
        if (!account) {
            throw new httpError_1.HttpError(404, 'Account not found');
        }
        const openingDate = from ? new Date(`${from}T00:00:00Z`) : undefined;
        const closingDate = to ? new Date(`${to}T23:59:59Z`) : undefined;
        // Only calculate opening if a from date is provided
        // If no from date, opening is implicit in the vouchers query
        const opening = openingDate ? yield getOpeningFromVouchers(accountId, openingDate) : 0;
        const vouchers = yield prisma_1.prisma.voucher.findMany({
            where: Object.assign({}, (openingDate || closingDate
                ? {
                    vdate: Object.assign(Object.assign({}, (openingDate ? { gte: openingDate } : {})), (closingDate ? { lte: closingDate } : {})),
                }
                : {})),
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
        const rows = vouchers.flatMap((voucher) => voucher.rows.length ?
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
            }) : []);
        return {
            account: mapAccount(account),
            opening,
            closing: balance,
            rows: rows,
        };
    });
}
function getTrialBalance() {
    return __awaiter(this, void 0, void 0, function* () {
        const accounts = yield prisma_1.prisma.account.findMany({
            where: { active: true },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        const vouchers = yield prisma_1.prisma.voucher.findMany({
            include: { rows: true },
            orderBy: [{ vdate: 'desc' }, { createdAt: 'desc' }],
        });
        const rows = yield Promise.all(accounts.map((account) => __awaiter(this, void 0, void 0, function* () {
            let dr = 0;
            let cr = 0;
            for (const voucher of vouchers) {
                for (const row of voucher.rows.filter((entry) => entry.accountId === account.id)) {
                    dr += toNumber(row.dr);
                    cr += toNumber(row.cr);
                }
            }
            const opening = yield getOpeningFromVouchers(account.id);
            const balance = dr - cr;
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                opening: 0,
                dr,
                cr,
                balance,
            };
        })));
        return {
            rows,
            totals: {
                dr: rows.reduce((sum, row) => sum + row.dr, 0),
                cr: rows.reduce((sum, row) => sum + row.cr, 0),
            },
        };
    });
}
function getExpenseSummary(year) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!Number.isFinite(year)) {
            const meta = yield getReportMeta();
            year = (_a = meta.latestVoucherYear) !== null && _a !== void 0 ? _a : new Date().getUTCFullYear();
        }
        const start = new Date(`${year}-01-01T00:00:00Z`);
        const end = new Date(`${year}-12-31T23:59:59Z`);
        const vouchers = yield prisma_1.prisma.voucher.findMany({
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
                var _a, _b;
                const type = normalizeType(((_a = row.account) === null || _a === void 0 ? void 0 : _a.type) || '');
                const isDriverAccount = ((_b = row.account) === null || _b === void 0 ? void 0 : _b.partyKind) === 'driver';
                if (type !== 'expense' &&
                    type !== 'transport' &&
                    !isDriverAccount) {
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
            }
            else {
                months[monthIndex].variable += expenseAmount;
            }
        }
        return months;
    });
}
