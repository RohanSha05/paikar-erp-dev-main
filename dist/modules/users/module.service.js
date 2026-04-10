"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const SALT_ROUNDS = 10;
async function listUsers() {
    return prisma_1.prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
}
async function createUser(input) {
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw new httpError_1.HttpError(409, 'Email already exists');
    }
    const passwordHash = await bcrypt_1.default.hash(input.password, SALT_ROUNDS);
    return prisma_1.prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            passwordHash,
            role: input.role,
            active: input.active
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true
        }
    });
}
async function updateUser(id, input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new httpError_1.HttpError(404, 'User not found');
    }
    let passwordHash;
    if (input.password) {
        passwordHash = await bcrypt_1.default.hash(input.password, SALT_ROUNDS);
    }
    return prisma_1.prisma.user.update({
        where: { id },
        data: {
            name: input.name,
            role: input.role,
            active: input.active,
            ...(passwordHash ? { passwordHash } : {})
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true
        }
    });
}
