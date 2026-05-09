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
exports.createParty = createParty;
exports.listParties = listParties;
exports.resolvePartyAccount = resolvePartyAccount;
exports.listAccounts = listAccounts;
exports.createVoucher = createVoucher;
exports.getVoucherById = getVoucherById;
exports.listVouchers = listVouchers;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
const sequence_id_1 = require("../../common/utils/sequence-id");
function slugify(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);
}
function normalizePartyType(input) {
    const value = input.trim().toUpperCase();
    if (value === 'SELLER')
        return 'SELLER';
    if (value === 'CUSTOMER')
        return 'CUSTOMER';
    if (value === 'MILL')
        return 'MILL';
    if (value === 'DRIVER')
        return 'DRIVER';
    if (value === 'INVESTOR')
        return 'INVESTOR';
    if (value === 'EMPLOYEE')
        return 'EMPLOYEE';
    return 'OTHER';
}
function generatePartyCode(type) {
    return __awaiter(this, void 0, void 0, function* () {
        const typeTag = slugify(type).slice(0, 4) || 'PRTY';
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.party, 'code', `PTY-${typeTag}`);
    });
}
function generateDriverId() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.driver, 'id', 'DRV');
    });
}
function generateInvestorId() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.investor, 'id', 'INV');
    });
}
function masterPartyCode(kind, id) {
    const k = kind.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const r = id.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '-');
    return `MST-${k}-${r}`.slice(0, 64);
}
function partyAccountCodeForPartyTable(type, partyCode) {
    const normType = type.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const normCode = partyCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    return `PTY-${normType}-${normCode}`.slice(0, 64);
}
/**
 * Create a party in Party table.
 */
function createParty(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = input.name.trim();
        if (!name) {
            throw new httpError_1.HttpError(400, 'Party name is required');
        }
        const type = normalizePartyType(input.type);
        if (type === 'SELLER') {
            const existingSeller = yield prisma_1.prisma.seller.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                },
            });
            const seller = existingSeller || (yield prisma_1.prisma.seller.create({ data: { name } }));
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'seller',
                refId: seller.id,
                name: seller.name,
                type: 'party',
                code: `PTY-SELLER-${seller.id}`.slice(0, 64),
            });
            return {
                id: seller.id,
                code: masterPartyCode('seller', seller.id),
                name: seller.name,
                type: 'seller',
                active: true,
                accountId: account.id,
            };
        }
        if (type === 'CUSTOMER') {
            const existingCustomer = yield prisma_1.prisma.customer.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                },
            });
            const customer = existingCustomer || (yield prisma_1.prisma.customer.create({ data: { name } }));
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'customer',
                refId: customer.id,
                name: customer.name,
                type: 'party',
                code: `PTY-CUSTOMER-${customer.id}`.slice(0, 64),
            });
            return {
                id: customer.id,
                code: masterPartyCode('customer', customer.id),
                name: customer.name,
                type: 'customer',
                active: true,
                accountId: account.id,
            };
        }
        if (type === 'DRIVER') {
            const existingDriver = yield prisma_1.prisma.driver.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                },
            });
            const driver = existingDriver || (yield prisma_1.prisma.driver.create({
                data: {
                    id: yield generateDriverId(),
                    name,
                    active: true,
                },
            }));
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'driver',
                refId: driver.id,
                name: driver.name,
                type: 'party',
                code: `PTY-DRIVER-${driver.id}`.slice(0, 64),
            });
            return {
                id: driver.id,
                code: masterPartyCode('driver', driver.id),
                name: driver.name,
                type: 'driver',
                active: driver.active,
                accountId: account.id,
            };
        }
        if (type === 'INVESTOR') {
            const existingInvestor = yield prisma_1.prisma.investor.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive',
                    },
                },
            });
            const investor = existingInvestor || (yield prisma_1.prisma.investor.create({
                data: {
                    id: yield generateInvestorId(),
                    name,
                    active: true,
                },
            }));
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'investor',
                refId: investor.id,
                name: investor.name,
                type: 'party',
                code: `PTY-INVESTOR-${investor.id}`.slice(0, 64),
            });
            return {
                id: investor.id,
                code: masterPartyCode('investor', investor.id),
                name: investor.name,
                type: 'investor',
                active: investor.active,
                accountId: account.id,
            };
        }
        const existing = yield prisma_1.prisma.party.findFirst({
            where: {
                active: true,
                type,
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });
        if (existing) {
            return {
                id: existing.id,
                code: existing.code,
                name: existing.name,
                type: existing.type.toLowerCase(),
                active: existing.active,
            };
        }
        const code = yield generatePartyCode(type);
        const created = yield prisma_1.prisma.party.create({
            data: {
                code,
                name,
                type,
                active: true,
            },
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: created.type.toLowerCase(),
            refId: created.id,
            name: created.name,
            code: partyAccountCodeForPartyTable(created.type, created.code),
            type: 'party',
        });
        return {
            id: created.id,
            code: created.code,
            name: created.name,
            type: created.type.toLowerCase(),
            active: created.active,
        };
    });
}
/**
 * List all active parties from Party table, optionally filtered by type.
 * Also returns linked party account if it exists.
 */
function listParties(kind) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const type = kind ? normalizePartyType(kind) : undefined;
        const includeSellers = !type || type === 'SELLER';
        const includeCustomers = !type || type === 'CUSTOMER';
        const includeDrivers = !type || type === 'DRIVER';
        const includeInvestors = !type || type === 'INVESTOR';
        const includeGenericPartyTable = !type || ['MILL', 'EMPLOYEE', 'OTHER'].includes(type);
        const [sellers, customers, drivers, investors, parties, linkedAccounts] = yield Promise.all([
            includeSellers ? prisma_1.prisma.seller.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
            includeCustomers ? prisma_1.prisma.customer.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
            includeDrivers ? prisma_1.prisma.driver.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
            includeInvestors ? prisma_1.prisma.investor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
            includeGenericPartyTable
                ? prisma_1.prisma.party.findMany({
                    where: Object.assign({ active: true }, (type ? { type } : {})),
                    orderBy: [{ type: 'asc' }, { name: 'asc' }],
                })
                : Promise.resolve([]),
            prisma_1.prisma.account.findMany({
                where: { type: 'party' },
                select: { id: true, partyKind: true, partyRefId: true, opening: true, },
            }),
        ]);
        const accountByRef = new Map();
        for (const account of linkedAccounts) {
            const k = `${(account.partyKind || '').toLowerCase()}:${account.partyRefId || ''}`;
            if (account.partyKind && account.partyRefId && !accountByRef.has(k)) {
                accountByRef.set(k, {
                    id: account.id,
                    opening: account.opening ? Number(account.opening) : 0,
                });
                // for a specific seller:
                sellers.forEach(s => {
                    const key = `seller:${s.id}`;
                });
            }
        }
        const rows = [];
        for (const seller of sellers) {
            rows.push({
                id: seller.id,
                code: masterPartyCode('seller', seller.id),
                name: seller.name,
                type: 'seller',
                active: true,
                accountId: (_a = accountByRef.get(`seller:${seller.id}`)) === null || _a === void 0 ? void 0 : _a.id,
                opening: (_c = (_b = accountByRef.get(`seller:${seller.id}`)) === null || _b === void 0 ? void 0 : _b.opening) !== null && _c !== void 0 ? _c : 0,
            });
        }
        for (const customer of customers) {
            rows.push({
                id: customer.id,
                code: masterPartyCode('customer', customer.id),
                name: customer.name,
                type: 'customer',
                active: true,
                accountId: (_d = accountByRef.get(`customer:${customer.id}`)) === null || _d === void 0 ? void 0 : _d.id,
                opening: (_f = (_e = accountByRef.get(`customer:${customer.id}`)) === null || _e === void 0 ? void 0 : _e.opening) !== null && _f !== void 0 ? _f : 0,
            });
        }
        for (const driver of drivers) {
            rows.push({
                id: driver.id,
                code: masterPartyCode('driver', driver.id),
                name: driver.name,
                type: 'driver',
                active: driver.active,
                accountId: (_g = accountByRef.get(`driver:${driver.id}`)) === null || _g === void 0 ? void 0 : _g.id,
                opening: (_j = (_h = accountByRef.get(`driver:${driver.id}`)) === null || _h === void 0 ? void 0 : _h.opening) !== null && _j !== void 0 ? _j : 0,
            });
        }
        for (const investor of investors) {
            rows.push({
                id: investor.id,
                code: masterPartyCode('investor', investor.id),
                name: investor.name,
                type: 'investor',
                active: investor.active,
                accountId: (_k = accountByRef.get(`investor:${investor.id}`)) === null || _k === void 0 ? void 0 : _k.id,
                opening: (_m = (_l = accountByRef.get(`investor:${investor.id}`)) === null || _l === void 0 ? void 0 : _l.opening) !== null && _m !== void 0 ? _m : 0,
            });
        }
        for (const party of parties) {
            rows.push({
                id: party.id,
                code: party.code,
                name: party.name,
                type: party.type.toLowerCase(),
                active: party.active,
                accountId: (_o = accountByRef.get(`${party.type.toLowerCase()}:${party.id}`)) === null || _o === void 0 ? void 0 : _o.id,
                opening: (_q = (_p = accountByRef.get(`${party.type.toLowerCase()}:${party.id}`)) === null || _p === void 0 ? void 0 : _p.opening) !== null && _q !== void 0 ? _q : 0,
            });
        }
        return rows.sort((a, b) => {
            if (a.type !== b.type)
                return a.type.localeCompare(b.type);
            return a.name.localeCompare(b.name);
        });
    });
}
/**
 * Resolve party account by Party.id, creating one if it does not exist.
 * This keeps settlement tied to Party table while still posting into ledger accounts.
 */
function resolvePartyAccount(partyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const party = yield prisma_1.prisma.party.findUnique({ where: { id: partyId } });
        if (party === null || party === void 0 ? void 0 : party.active) {
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: party.type.toLowerCase(),
                refId: party.id,
                name: party.name,
                code: partyAccountCodeForPartyTable(party.type, party.code),
                type: 'party',
            });
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                active: account.active,
                opening: account.opening ? Number(account.opening) : 0,
            };
        }
        const seller = yield prisma_1.prisma.seller.findUnique({ where: { id: partyId } });
        if (seller) {
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'seller',
                refId: seller.id,
                name: seller.name,
                type: 'party',
            });
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                active: account.active,
                opening: account.opening ? Number(account.opening) : 0,
            };
        }
        const customer = yield prisma_1.prisma.customer.findUnique({ where: { id: partyId } });
        if (customer) {
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'customer',
                refId: customer.id,
                name: customer.name,
                type: 'party',
            });
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                active: account.active,
                opening: account.opening ? Number(account.opening) : 0,
            };
        }
        const driver = yield prisma_1.prisma.driver.findUnique({ where: { id: partyId } });
        if (driver === null || driver === void 0 ? void 0 : driver.active) {
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'driver',
                refId: driver.id,
                name: driver.name,
                type: 'party',
            });
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                active: account.active,
                opening: account.opening ? Number(account.opening) : 0,
            };
        }
        const investor = yield prisma_1.prisma.investor.findUnique({ where: { id: partyId } });
        if (investor === null || investor === void 0 ? void 0 : investor.active) {
            const account = yield (0, party_account_1.ensurePartyAccount)({
                kind: 'investor',
                refId: investor.id,
                name: investor.name,
                type: 'party',
            });
            return {
                id: account.id,
                code: account.code,
                name: account.name,
                type: account.type,
                active: account.active,
                opening: account.opening ? Number(account.opening) : 0,
            };
        }
        throw new httpError_1.HttpError(404, 'Party not found');
    });
}
/**
 * List all active accounts, optionally filtered by type
 */
function listAccounts(filterByType) {
    return __awaiter(this, void 0, void 0, function* () {
        const accounts = yield prisma_1.prisma.account.findMany({
            where: Object.assign({ active: true }, (filterByType && { type: filterByType })),
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        return accounts.map((acc) => ({
            id: acc.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            active: acc.active,
            opening: acc.opening ? Number(acc.opening) : 0,
        }));
    });
}
/**
 * Generate unique voucher number (VCH-YYYYMMDD-001 format)
 */
function generateVoucherNumber(vdate) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.voucher, 'voucherNo', 'VCH', new Date(`${vdate}T00:00:00.000Z`));
    });
}
/**
 * Resolve voucher row account references from either account.id or account.code.
 */
function resolveVoucherRowAccounts(rows) {
    return __awaiter(this, void 0, void 0, function* () {
        const requested = rows.map((r) => r.accountId);
        const uniqueRequested = [...new Set(requested)];
        const foundAccounts = yield prisma_1.prisma.account.findMany({
            where: {
                OR: [
                    { id: { in: uniqueRequested } },
                    { code: { in: uniqueRequested } },
                ],
            },
            select: { id: true, code: true },
        });
        const accountIdByAnyKey = new Map();
        for (const account of foundAccounts) {
            accountIdByAnyKey.set(account.id, account.id);
            accountIdByAnyKey.set(account.code, account.id);
        }
        return rows.map((row) => {
            const resolvedId = accountIdByAnyKey.get(row.accountId);
            if (!resolvedId) {
                throw new httpError_1.HttpError(404, `Account not found: ${row.accountId}`);
            }
            return Object.assign(Object.assign({}, row), { accountId: resolvedId });
        });
    });
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function ensureRoundingAccountId() {
    return __awaiter(this, void 0, void 0, function* () {
        const account = yield prisma_1.prisma.account.upsert({
            where: { code: 'AC-ROUND' },
            update: {},
            create: {
                code: 'AC-ROUND',
                name: 'Rounding Difference',
                type: 'income',
                active: true,
                opening: 0,
            },
            select: { id: true },
        });
        return account.id;
    });
}
/**
 * Create a new voucher with transaction rows
 */
function createVoucher(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!Array.isArray(input.rows) || input.rows.length === 0) {
            throw new httpError_1.HttpError(400, 'Voucher must contain at least one row');
        }
        const rows = input.rows.map((row) => ({
            accountId: row.accountId,
            dr: Number(row.dr || 0),
            cr: Number(row.cr || 0),
            memo: row.memo,
        }));
        // Debug log for payment vouchers
        if (((_a = input.narration) === null || _a === void 0 ? void 0 : _a.includes('payment')) || ((_b = input.narration) === null || _b === void 0 ? void 0 : _b.includes('receipt'))) {
            console.log('🔍 Settlement voucher:', {
                narration: input.narration,
                rows: rows.map((r) => ({
                    dr: r.dr,
                    cr: r.cr,
                    memo: r.memo,
                })),
            });
        }
        const totalDr = round2(rows.reduce((sum, row) => sum + Number(row.dr || 0), 0));
        const totalCr = round2(rows.reduce((sum, row) => sum + Number(row.cr || 0), 0));
        const diff = round2(totalDr - totalCr);
        if (Math.abs(diff) > 0.01) {
            throw new httpError_1.HttpError(400, `Debit/Credit must be equal (DR=${totalDr}, CR=${totalCr}, diff=${diff})`);
        }
        if (Math.abs(diff) > 0) {
            const roundingAccountId = yield ensureRoundingAccountId();
            rows.push(diff > 0
                ? { accountId: roundingAccountId, dr: 0, cr: Math.abs(diff), memo: 'Auto rounding (CR)' }
                : { accountId: roundingAccountId, dr: Math.abs(diff), cr: 0, memo: 'Auto rounding (DR)' });
        }
        const resolvedRows = yield resolveVoucherRowAccounts(rows);
        // Generate voucher number
        const voucherNo = yield generateVoucherNumber(input.vdate);
        // Parse date to ensure it's valid
        const vdate = new Date(input.vdate + 'T00:00:00Z');
        if (isNaN(vdate.getTime())) {
            throw new httpError_1.HttpError(400, 'Invalid date format');
        }
        // Create voucher with rows in a transaction
        const voucher = yield prisma_1.prisma.voucher.create({
            data: {
                voucherNo,
                vtype: input.vtype,
                vdate,
                narration: input.narration || `${input.vtype} voucher`,
                rows: {
                    create: resolvedRows.map((row) => ({
                        accountId: row.accountId,
                        dr: row.dr || 0,
                        cr: row.cr || 0,
                        memo: row.memo,
                    })),
                },
            },
            include: {
                rows: {
                    include: {
                        account: true,
                    },
                },
            },
        });
        return mapVoucherToDto(voucher);
    });
}
/**
 * Get a single voucher by ID with all details
 */
function getVoucherById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const voucher = yield prisma_1.prisma.voucher.findUnique({
            where: { id },
            include: {
                rows: {
                    include: {
                        account: true,
                    },
                },
            },
        });
        if (!voucher) {
            throw new httpError_1.HttpError(404, 'Voucher not found');
        }
        return mapVoucherToDto(voucher);
    });
}
/**
 * List vouchers with optional date range filter
 */
function listVouchers(startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = {};
        if (startDate) {
            where.vdate = Object.assign(Object.assign({}, where.vdate), { gte: new Date(startDate + 'T00:00:00Z') });
        }
        if (endDate) {
            where.vdate = Object.assign(Object.assign({}, where.vdate), { lte: new Date(endDate + 'T23:59:59Z') });
        }
        const vouchers = yield prisma_1.prisma.voucher.findMany({
            where,
            include: {
                rows: {
                    include: {
                        account: true,
                    },
                },
            },
            orderBy: {
                vdate: 'desc',
            },
        });
        return vouchers.map(mapVoucherToDto);
    });
}
/**
 * Helper to map Prisma voucher to DTO
 */
function mapVoucherToDto(voucher) {
    return {
        id: voucher.id,
        voucherNo: voucher.voucherNo,
        vtype: voucher.vtype,
        vdate: voucher.vdate.toISOString().split('T')[0],
        narration: voucher.narration,
        rows: voucher.rows.map((row) => ({
            id: row.id,
            accountId: row.accountId,
            account: row.account
                ? {
                    id: row.account.id,
                    code: row.account.code,
                    name: row.account.name,
                    type: row.account.type,
                    active: row.account.active,
                    opening: row.account.opening
                        ? Number(row.account.opening)
                        : 0,
                }
                : undefined,
            dr: Number(row.dr),
            cr: Number(row.cr),
            memo: row.memo,
        })),
        createdAt: voucher.createdAt.toISOString(),
    };
}
