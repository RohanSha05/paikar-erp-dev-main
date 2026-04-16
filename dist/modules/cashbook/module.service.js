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
function generatePartyCode(type, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const prefix = slugify(type).slice(0, 4) || 'PRTY';
        const base = slugify(name) || 'PARTY';
        for (let i = 0; i < 5; i += 1) {
            const code = `${prefix}-${base}-${Date.now().toString().slice(-5)}${i}`.slice(0, 40);
            const exists = yield prisma_1.prisma.party.findUnique({ where: { code } });
            if (!exists)
                return code;
        }
        return `${prefix}-${base}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    });
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
        const code = yield generatePartyCode(type, name);
        const created = yield prisma_1.prisma.party.create({
            data: {
                code,
                name,
                type,
                active: true,
            },
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
        const type = kind ? normalizePartyType(kind) : undefined;
        const parties = yield prisma_1.prisma.party.findMany({
            where: Object.assign({ active: true }, (type ? { type } : {})),
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        const partyAccountCodes = parties.map((party) => partyAccountCode(party.type, party.code));
        const linkedAccounts = partyAccountCodes.length
            ? yield prisma_1.prisma.account.findMany({
                where: {
                    type: 'party',
                    code: { in: partyAccountCodes },
                },
                select: { id: true, code: true },
            })
            : [];
        const accountByCode = new Map();
        for (const account of linkedAccounts) {
            accountByCode.set(account.code, account.id);
        }
        return parties.map((party) => ({
            id: party.id,
            code: party.code,
            name: party.name,
            type: party.type.toLowerCase(),
            active: party.active,
            accountId: accountByCode.get(partyAccountCode(party.type, party.code)),
        }));
    });
}
function partyAccountCode(type, partyCode) {
    const normType = type.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const normCode = partyCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    return `PTY-${normType}-${normCode}`.slice(0, 64);
}
/**
 * Resolve party account by Party.id, creating one if it does not exist.
 * This keeps settlement tied to Party table while still posting into ledger accounts.
 */
function resolvePartyAccount(partyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const party = yield prisma_1.prisma.party.findUnique({ where: { id: partyId } });
        if (!party || !party.active) {
            throw new httpError_1.HttpError(404, 'Party not found');
        }
        const accountCode = partyAccountCode(party.type, party.code);
        const existing = yield prisma_1.prisma.account.findFirst({
            where: {
                type: 'party',
                code: accountCode,
            },
        });
        if (existing) {
            return {
                id: existing.id,
                code: existing.code,
                name: existing.name,
                type: existing.type,
                active: existing.active,
                opening: existing.opening ? Number(existing.opening) : 0,
            };
        }
        const created = yield prisma_1.prisma.account.create({
            data: {
                code: accountCode,
                name: party.name,
                type: 'party',
                opening: 0,
                active: true,
            },
        });
        return {
            id: created.id,
            code: created.code,
            name: created.name,
            type: created.type,
            active: created.active,
            opening: created.opening ? Number(created.opening) : 0,
        };
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
 * Generate unique voucher number (YYYY-MM-DD-001 format)
 */
function generateVoucherNumber(vdate) {
    return __awaiter(this, void 0, void 0, function* () {
        // Format: YYYYMMDD-001
        const datePart = vdate.replace(/-/g, '');
        // Find highest sequence for this date
        const latestVoucher = yield prisma_1.prisma.voucher.findFirst({
            where: {
                voucherNo: {
                    startsWith: datePart,
                },
            },
            orderBy: {
                voucherNo: 'desc',
            },
        });
        let sequence = 1;
        if (latestVoucher) {
            const match = latestVoucher.voucherNo.match(/-(\d+)$/);
            if (match) {
                sequence = parseInt(match[1]) + 1;
            }
        }
        return `${datePart}-${String(sequence).padStart(3, '0')}`;
    });
}
/**
 * Validate that all accounts exist
 */
function validateAccounts(rows) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountIds = rows.map((r) => r.accountId);
        const uniqueIds = [...new Set(accountIds)];
        const foundAccounts = yield prisma_1.prisma.account.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
        });
        const foundIds = new Set(foundAccounts.map((a) => a.id));
        for (const id of uniqueIds) {
            if (!foundIds.has(id)) {
                throw new httpError_1.HttpError(404, `Account not found: ${id}`);
            }
        }
    });
}
/**
 * Create a new voucher with transaction rows
 */
function createVoucher(input) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate all accounts exist
        yield validateAccounts(input.rows);
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
                    create: input.rows.map((row) => ({
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
