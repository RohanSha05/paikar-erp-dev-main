"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDrivers = listDrivers;
exports.createDriver = createDriver;
exports.updateDriver = updateDriver;
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
function normalize(value) {
    return value?.trim() || undefined;
}
function generateDriverId() {
    return `DRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function listDrivers() {
    return prisma_1.prisma.driver.findMany({
        orderBy: { createdAt: 'desc' }
    });
}
async function createDriver(input) {
    const id = normalize(input.id) || generateDriverId();
    const exists = await prisma_1.prisma.driver.findUnique({ where: { id } });
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
}
async function updateDriver(id, input) {
    const existing = await prisma_1.prisma.driver.findUnique({ where: { id } });
    if (!existing) {
        throw new httpError_1.HttpError(404, 'Driver not found');
    }
    return prisma_1.prisma.driver.update({
        where: { id },
        data: {
            name: input.name?.trim(),
            phone: normalize(input.phone),
            truckNo: normalize(input.truckNo),
            licenseNo: normalize(input.licenseNo),
            active: input.active
        }
    });
}
