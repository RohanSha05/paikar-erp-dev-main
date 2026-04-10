"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const jwt_1 = require("../../common/jwt");
async function login(email, password) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email }
    });
    if (!user || !user.active) {
        throw new httpError_1.HttpError(401, 'Invalid credentials');
    }
    const ok = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!ok) {
        throw new httpError_1.HttpError(401, 'Invalid credentials');
    }
    const accessToken = (0, jwt_1.signAccessToken)({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    return {
        accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
}
