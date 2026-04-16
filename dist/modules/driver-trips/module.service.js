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
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function normalize(value) {
    if (value === null)
        return null;
    return (value === null || value === void 0 ? void 0 : value.trim()) || undefined;
}
function generateTripId() {
    return `TRIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function parseDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        throw new httpError_1.HttpError(400, 'Invalid trip date');
    }
    return d;
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
        const tripId = normalize(input.id) || generateTripId();
        const existing = yield prisma_1.prisma.driverTrip.findUnique({ where: { id: tripId } });
        if (existing) {
            throw new httpError_1.HttpError(409, 'Trip ID already exists');
        }
        const driver = yield prisma_1.prisma.driver.findUnique({ where: { id: input.driverId } });
        if (!driver) {
            throw new httpError_1.HttpError(404, 'Driver not found');
        }
        const settled = input.settled === true;
        return prisma_1.prisma.driverTrip.create({
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
                settled,
                settledAt: settled ? (input.settledAt ? parseDate(input.settledAt) : new Date()) : null
            }
        });
    });
}
function updateDriverTrip(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.driverTrip.findUnique({ where: { id } });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Driver trip not found');
        }
        const settled = input.settled;
        return prisma_1.prisma.driverTrip.update({
            where: { id },
            data: {
                driverName: normalize(input.driverName),
                date: input.date ? parseDate(input.date) : undefined,
                route: normalize(input.route),
                truckNo: normalize(input.truckNo),
                amount: typeof input.amount === 'number' ? new client_1.Prisma.Decimal(input.amount) : undefined,
                memo: normalize(input.memo),
                poId: normalize(input.poId),
                settled,
                settledAt: settled === true
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
    });
}
