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
exports.listDrivers = listDrivers;
exports.createDriver = createDriver;
exports.updateDriver = updateDriver;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function normalize(value) {
    return (value === null || value === void 0 ? void 0 : value.trim()) || undefined;
}
function generateDriverId() {
    return `DRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
function listDrivers() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.driver.findMany({
            orderBy: { createdAt: 'desc' }
        });
    });
}
function createDriver(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = normalize(input.id) || generateDriverId();
        const exists = yield prisma_1.prisma.driver.findUnique({ where: { id } });
        if (exists) {
            throw new httpError_1.HttpError(409, 'Driver ID already exists');
        }
        return prisma_1.prisma.driver.create({
            data: {
                id,
                name: input.name.trim(),
                phone: normalize(input.phone),
                truckNo: normalize(input.truckNo),
                licenseNo: normalize(input.licenseNo),
                active: input.active !== false
            }
        });
    });
}
function updateDriver(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const existing = yield prisma_1.prisma.driver.findUnique({ where: { id } });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Driver not found');
        }
        return prisma_1.prisma.driver.update({
            where: { id },
            data: {
                name: (_a = input.name) === null || _a === void 0 ? void 0 : _a.trim(),
                phone: normalize(input.phone),
                truckNo: normalize(input.truckNo),
                licenseNo: normalize(input.licenseNo),
                active: input.active
            }
        });
    });
}
