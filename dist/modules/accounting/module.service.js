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
exports.listAccounts = listAccounts;
exports.createAccount = createAccount;
exports.getDaybook = getDaybook;
exports.getLedger = getLedger;
exports.getTrialBalance = getTrialBalance;
exports.getExpenseSummary = getExpenseSummary;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
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
function generateAccountCode(name, type) {
    const prefix = slugify(type || 'AC');
    const suffix = slugify(name || 'ACCOUNT');
    return `${prefix}-${suffix}-${Date.now().toString().slice(-5)}`;
}
function mapAccount(account) {
    return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        active: account.active,
        opening: toNumber(account.opening),
    };
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
                { vdate: 'asc' },
                { createdAt: 'asc' },
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
        return accounts.map(mapAccount);
    });
}
function createAccount(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const code = (input.code || generateAccountCode(input.name, input.type)).trim();
        const exists = yield prisma_1.prisma.account.findUnique({ where: { code } });
        if (exists) {
            throw new httpError_1.HttpError(409, 'Account code already exists');
        }
        const account = yield prisma_1.prisma.account.create({
            data: {
                code,
                name: input.name.trim(),
                type: input.type.trim(),
                opening: input.opening !== undefined ? new client_1.Prisma.Decimal(input.opening) : undefined,
                active: input.active !== false,
                partyKind: ((_a = input.partyKind) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
                partyRefId: ((_b = input.partyRefId) === null || _b === void 0 ? void 0 : _b.trim()) || undefined,
                bankInfo: ((_c = input.bankInfo) === null || _c === void 0 ? void 0 : _c.trim()) || undefined,
            },
        });
        return mapAccount(account);
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
        const openingVouchers = openingDate
            ? yield prisma_1.prisma.voucher.findMany({
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
        const rows = vouchers.flatMap((voucher) => voucher.rows.map((row) => {
            balance += toNumber(row.dr) - toNumber(row.cr);
            return {
                vId: voucher.voucherNo,
                date: voucher.vdate.toISOString().slice(0, 10),
                memo: row.memo || voucher.narration || undefined,
                dr: toNumber(row.dr),
                cr: toNumber(row.cr),
                balance,
            };
        }));
        return {
            account: mapAccount(account),
            opening,
            closing: balance,
            rows,
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
            orderBy: [{ vdate: 'asc' }, { createdAt: 'asc' }],
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
    });
}
function getExpenseSummary(year) {
    return __awaiter(this, void 0, void 0, function* () {
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
            orderBy: [{ vdate: 'asc' }, { createdAt: 'asc' }],
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
                var _a;
                const type = normalizeType(((_a = row.account) === null || _a === void 0 ? void 0 : _a.type) || '');
                if (type !== 'expense' && type !== 'transport') {
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
