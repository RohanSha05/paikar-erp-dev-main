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
exports.listInvestors = listInvestors;
exports.getInvestor = getInvestor;
exports.createInvestor = createInvestor;
exports.updateInvestor = updateInvestor;
exports.deleteInvestor = deleteInvestor;
exports.getInvestorTxns = getInvestorTxns;
exports.createInvestorTxn = createInvestorTxn;
exports.getInvestorBalance = getInvestorBalance;
const prisma_1 = require("../../db/prisma");
const party_account_1 = require("../accounting/party-account");
const module_service_1 = require("../cashbook/module.service");
const sequence_id_1 = require("../../common/utils/sequence-id");
function listInvestors() {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.investor.findMany({
            orderBy: { createdAt: 'desc' },
        });
    });
}
function getInvestor(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.investor.findUnique({ where: { id } });
    });
}
function createInvestor(data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const id = yield (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.investor, 'id', 'INV');
        const effectiveNidNo = (_a = data.nidNo) !== null && _a !== void 0 ? _a : data.nid;
        const effectiveAgreementPct = (_b = data.agreementPct) !== null && _b !== void 0 ? _b : data.profitSharePct;
        const investor = yield prisma_1.prisma.investor.create({
            data: {
                id,
                name: data.name,
                phone: data.phone,
                address: data.address,
                nidNo: effectiveNidNo,
                nomineeName: data.nomineeName,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                photoUrl: data.photoUrl,
                agreementPct: effectiveAgreementPct,
                notes: data.notes,
                active: (_c = data.active) !== null && _c !== void 0 ? _c : true,
            },
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'investor',
            refId: investor.id,
            name: investor.name,
            type: 'party',
        });
        return investor;
    });
}
function updateInvestor(id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const anyData = data;
        const effectiveNidNo = (_a = data.nidNo) !== null && _a !== void 0 ? _a : anyData.nid;
        const effectiveAgreementPct = (_b = data.agreementPct) !== null && _b !== void 0 ? _b : anyData.profitSharePct;
        const effectiveStartDate = typeof anyData.startDate === 'string'
            ? new Date(anyData.startDate)
            : anyData.startDate;
        const investor = yield prisma_1.prisma.investor.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address,
                nidNo: effectiveNidNo,
                nomineeName: data.nomineeName,
                startDate: effectiveStartDate,
                photoUrl: data.photoUrl,
                agreementPct: effectiveAgreementPct,
                notes: data.notes,
                active: data.active,
                updatedAt: new Date(),
            },
        });
        yield (0, party_account_1.ensurePartyAccount)({
            kind: 'investor',
            refId: investor.id,
            name: investor.name,
            type: 'party',
        });
        return investor;
    });
}
function deleteInvestor(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma_1.prisma.investor.delete({ where: { id } });
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
function getInvestorTxns(investorId) {
    return __awaiter(this, void 0, void 0, function* () {
        const where = investorId ? { investorId } : {};
        return prisma_1.prisma.investorTxn.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    });
}
function createInvestorTxn(data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const investor = yield prisma_1.prisma.investor.findUnique({ where: { id: data.investorId } });
        if (!investor) {
            throw new Error('Investor not found');
        }
        const investorAccount = yield (0, party_account_1.ensurePartyAccount)({
            kind: 'investor',
            refId: investor.id,
            name: investor.name,
            type: 'party',
        });
        const amount = Number(data.amount || 0);
        const payAccountId = data.payAccountId || data.instrument || 'AC-CASH';
        const defaultMemoByKind = {
            capitalIn: 'Capital In',
            capitalOut: 'Capital Out',
            profitPay: 'Profit Distribution',
            adjustment: 'Adjustment',
            payout: 'Payout',
        };
        const memo = ((_a = data.memo) === null || _a === void 0 ? void 0 : _a.trim()) || defaultMemoByKind[data.kind];
        const rows = data.kind === 'capitalIn'
            ? [
                { accountId: payAccountId, dr: amount, cr: 0, memo },
                { accountId: investorAccount.id, dr: 0, cr: amount, memo },
            ]
            : data.kind === 'adjustment'
                ? [
                    { accountId: investorAccount.id, dr: amount, cr: 0, memo },
                    { accountId: 'AC-EXP', dr: 0, cr: amount, memo: memo || 'Investor adjustment expense' },
                ]
                : [
                    { accountId: investorAccount.id, dr: amount, cr: 0, memo },
                    { accountId: payAccountId, dr: 0, cr: amount, memo },
                ];
        const voucher = yield (0, module_service_1.createVoucher)({
            vtype: 'journal',
            vdate: data.date,
            narration: `Investor ${data.kind}: ${memo} - ${investor.name}`,
            rows: rows.map((row) => ({
                accountId: row.accountId,
                dr: row.dr,
                cr: row.cr,
                memo: row.memo,
            })),
        });
        const id = yield (0, sequence_id_1.nextDailySequenceIdForDelegate)(prisma_1.prisma.investorTxn, 'id', 'INVTX');
        return prisma_1.prisma.investorTxn.create({
            data: {
                id,
                investorId: data.investorId,
                kind: data.kind,
                date: new Date(data.date),
                amount: data.amount,
                instrument: data.instrument || payAccountId,
                memo: data.memo,
                voucherId: voucher.id,
            },
        });
    });
}
function getInvestorBalance(investorId) {
    return __awaiter(this, void 0, void 0, function* () {
        const txns = yield getInvestorTxns(investorId);
        let capital = 0;
        let profitPaid = 0;
        let adjustment = 0;
        let payout = 0;
        for (const t of txns) {
            if (t.kind === 'capitalIn')
                capital += t.amount;
            if (t.kind === 'capitalOut')
                capital -= t.amount;
            if (t.kind === 'profitPay')
                profitPaid += t.amount;
            if (t.kind === 'adjustment')
                adjustment += t.amount;
            if (t.kind === 'payout')
                payout += t.amount;
        }
        return {
            capital: Math.round(capital * 100) / 100,
            profitPaid: Math.round(profitPaid * 100) / 100,
            adjustment: Math.round(adjustment * 100) / 100,
            payout: Math.round(payout * 100) / 100,
            net: Math.round((capital - profitPaid - adjustment - payout) * 100) / 100,
        };
    });
}
