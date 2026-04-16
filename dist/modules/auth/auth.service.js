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
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const jwt_1 = require("../../common/jwt");
function login(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user || !user.active) {
            throw new httpError_1.HttpError(401, 'Invalid credentials');
        }
        const ok = yield bcrypt_1.default.compare(password, user.passwordHash);
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
    });
}
