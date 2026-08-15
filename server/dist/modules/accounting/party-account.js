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
exports.partyAccountCode = partyAccountCode;
exports.ensurePartyAccount = ensurePartyAccount;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
function normalizeToken(value) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function partyAccountCode(kind, refId) {
    const safeKind = normalizeToken(kind || 'party') || 'PARTY';
    const safeRef = normalizeToken(refId || 'unknown') || 'UNKNOWN';
    return `PTY-${safeKind}-${safeRef}`.slice(0, 64);
}
function ensurePartyAccount(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const code = (input.code || partyAccountCode(input.kind, input.refId)).trim();
        const kind = input.kind.trim().toLowerCase();
        const refId = input.refId.trim();
        const name = input.name.trim();
        const existing = yield prisma_1.prisma.account.findFirst({
            where: {
                OR: [
                    { code },
                    { partyKind: kind, partyRefId: refId },
                ],
            },
        });
        if (existing) {
            return existing;
        }
        return prisma_1.prisma.account.create({
            data: {
                code,
                name,
                type: ((_a = input.type) === null || _a === void 0 ? void 0 : _a.trim()) || 'party',
                partyKind: kind,
                partyRefId: refId,
                bankInfo: ((_b = input.bankInfo) === null || _b === void 0 ? void 0 : _b.trim()) || undefined,
                opening: new client_1.Prisma.Decimal(0),
                active: true,
            },
        });
    });
}
