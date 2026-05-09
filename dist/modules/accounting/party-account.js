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
function ensurePartyAccount(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const kind = params.kind.trim().toLowerCase();
        const refId = params.refId.trim();
        const code = params.code || `AC-${kind.toUpperCase()}-${refId}`.slice(0, 64);
        return prisma_1.prisma.account.upsert({
            where: { code },
            update: {
                name: params.name.trim(),
                type: params.type,
                partyKind: kind,
                partyRefId: refId,
                active: true,
            },
            create: {
                code,
                name: params.name.trim(),
                type: params.type,
                partyKind: kind,
                partyRefId: refId,
                active: true,
            },
        });
    });
}
