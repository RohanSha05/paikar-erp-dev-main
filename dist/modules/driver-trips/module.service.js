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
exports.listDriverTrips = listDriverTrips;
exports.createDriverTrip = createDriverTrip;
exports.updateDriverTrip = updateDriverTrip;
exports.settleDriverTrip = settleDriverTrip;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const party_account_1 = require("../accounting/party-account");
const sequence_id_1 = require("../../common/utils/sequence-id");
function normalize(value) {
    if (value === null)
        return null;
    return (value === null || value === void 0 ? void 0 : value.trim()) || undefined;
}
function generateTripId() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.driverTrip, 'id', 'TRIP');
    });
}
function generateVoucherNo(tx, date) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH', date);
    });
}
function parseDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        throw new httpError_1.HttpError(400, 'Invalid trip date');
    }
    return d;
}
function resolveRowAccountIds(tx, rows) {
    return __awaiter(this, void 0, void 0, function* () {
        const requested = [...new Set(rows.map((row) => row.accountId))];
        const accounts = yield tx.account.findMany({
            where: {
                OR: [{ id: { in: requested } }, { code: { in: requested } }],
            },
            select: { id: true, code: true },
        });
        const idByAnyKey = new Map();
        for (const account of accounts) {
            idByAnyKey.set(account.id, account.id);
            idByAnyKey.set(account.code, account.id);
        }
        return rows.map((row) => {
            const resolved = idByAnyKey.get(row.accountId);
            if (!resolved) {
                throw new httpError_1.HttpError(404, `Account not found: ${row.accountId}`);
            }
            return Object.assign(Object.assign({}, row), { accountId: resolved });
        });
    });
}
function postTripVoucher(tx, trip, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const driver = yield tx.driver.findUnique({ where: { id: trip.driverId } });
        if (!driver) {
            throw new httpError_1.HttpError(404, 'Driver not found');
        }
        const driverAccount = yield (0, party_account_1.ensurePartyAccount)({
            kind: 'driver',
            refId: driver.id,
            name: driver.name,
            type: 'party',
        });
        const tripAmount = Number(trip.amount || 0);
        const payNowAmount = Number((options === null || options === void 0 ? void 0 : options.payNowAmount) || 0);
        const rows = [];
        if ((options === null || options === void 0 ? void 0 : options.payAccountId) && payNowAmount > 0) {
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
                memo: (options === null || options === void 0 ? void 0 : options.memo) || trip.driverName || driver.name,
            });
            rows.push({
                accountId: driverAccount.id,
                cr: tripAmount,
                memo: (options === null || options === void 0 ? void 0 : options.memo) || trip.driverName || driver.name,
            });
        }
        if (!rows.length) {
            return null;
        }
        const resolvedRows = yield resolveRowAccountIds(tx, rows);
        const voucher = yield tx.voucher.create({
            data: {
                voucherNo: yield generateVoucherNo(tx, trip.date),
                vtype: 'journal',
                vdate: trip.date,
                narration: (options === null || options === void 0 ? void 0 : options.memo) || `Driver trip ${trip.id}`,
            },
        });
        yield tx.voucherRow.createMany({
            data: resolvedRows.map((row) => ({
                voucherId: voucher.id,
                accountId: row.accountId,
                dr: new client_1.Prisma.Decimal(row.dr || 0),
                cr: new client_1.Prisma.Decimal(row.cr || 0),
                memo: row.memo,
            })),
        });
        return voucher;
    });
}
function listDriverTrips() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.driverTrip.findMany({
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });
    });
}
function createDriverTrip(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const tripId = normalize(input.id) || (yield generateTripId());
        const existing = yield prisma_1.prisma.driverTrip.findUnique({ where: { id: tripId } });
        if (existing) {
            throw new httpError_1.HttpError(409, 'Trip ID already exists');
        }
        const driver = yield prisma_1.prisma.driver.findUnique({ where: { id: input.driverId } });
        if (!driver) {
            throw new httpError_1.HttpError(404, 'Driver not found');
        }
        const settledRequested = input.settled === true;
        const trip = yield prisma_1.prisma.driverTrip.create({
            data: {
                id: tripId,
                driverId: input.driverId,
                driverName: normalize(input.driverName) || driver.name,
                date: parseDate(input.date),
                route: normalize(input.route),
                truckNo: normalize(input.truckNo) || driver.truckNo,
                amount: new client_1.Prisma.Decimal(input.amount),
                memo: normalize(input.memo),
                poId: normalize(input.poId),
                settled: false,
                settledAt: null,
            }
        });
        if (settledRequested) {
            return settleDriverTrip(trip.id, input.settledAt
                ? { settledAt: input.settledAt, memo: normalize(input.memo) || undefined }
                : { memo: normalize(input.memo) || undefined });
        }
        return trip;
    });
}
function updateDriverTrip(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.driverTrip.findUnique({ where: { id } });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Driver trip not found');
        }
        const trip = yield prisma_1.prisma.driverTrip.update({
            where: { id },
            data: {
                driverName: normalize(input.driverName),
                date: input.date ? parseDate(input.date) : undefined,
                route: normalize(input.route),
                truckNo: normalize(input.truckNo),
                amount: typeof input.amount === 'number' ? new client_1.Prisma.Decimal(input.amount) : undefined,
                memo: normalize(input.memo),
                poId: normalize(input.poId),
                settled: existing.settled,
                settledAt: existing.settledAt
            }
        });
        if (input.settled === true && !existing.settled) {
            return settleDriverTrip(trip.id, input.settledAt
                ? { settledAt: input.settledAt, memo: normalize(input.memo) || undefined }
                : { memo: normalize(input.memo) || undefined });
        }
        return trip;
    });
}
function settleDriverTrip(tripId, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const existing = yield tx.driverTrip.findUnique({ where: { id: tripId } });
            if (!existing) {
                throw new httpError_1.HttpError(404, 'Driver trip not found');
            }
            if (existing.settled) {
                return existing;
            }
            const voucher = yield postTripVoucher(tx, existing, options);
            if (!voucher) {
                return existing;
            }
            return tx.driverTrip.update({
                where: { id: tripId },
                data: {
                    settled: true,
                    settledAt: (options === null || options === void 0 ? void 0 : options.settledAt) ? parseDate(options.settledAt) : new Date(),
                },
            });
        }));
    });
}
