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
const module_service_1 = require("./module.service");
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
        var _a, _b;
        const kind = params.kind.trim().toLowerCase();
        const refId = params.refId.trim();
        const code = params.code || `AC-${kind.toUpperCase()}-${refId}`.slice(0, 64);
        const openingDr = Number((_a = params.openingDr) !== null && _a !== void 0 ? _a : 0);
        const openingCr = Number((_b = params.openingCr) !== null && _b !== void 0 ? _b : 0);
        return (0, module_service_1.createAccount)({
            code,
            name: params.name.trim(),
            type: params.type,
            openingDr: openingDr > 0 ? openingDr : 0,
            openingCr: openingCr > 0 ? openingCr : 0,
            active: true,
            partyKind: kind,
            partyRefId: refId,
        });
    });
}
