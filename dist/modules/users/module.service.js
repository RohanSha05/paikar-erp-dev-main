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
function listUsers() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function createUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existing) {
            throw new httpError_1.HttpError(409, 'Email already exists');
        }
        const passwordHash = yield bcrypt_1.default.hash(input.password, SALT_ROUNDS);
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
    });
}
function updateUser(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new httpError_1.HttpError(404, 'User not found');
        }
        let passwordHash;
        if (input.password) {
            passwordHash = yield bcrypt_1.default.hash(input.password, SALT_ROUNDS);
        }
        return prisma_1.prisma.user.update({
            where: { id },
            data: Object.assign({ name: input.name, role: input.role, active: input.active }, (passwordHash ? { passwordHash } : {})),
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
    });
}
