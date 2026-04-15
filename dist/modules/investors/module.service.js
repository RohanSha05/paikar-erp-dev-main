"use strict";
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
const uid_1 = require("../../common/utils/uid");
async function listInvestors() {
    return prisma_1.prisma.investor.findMany({
        orderBy: { createdAt: 'desc' },
    });
}
async function getInvestor(id) {
    return prisma_1.prisma.investor.findUnique({ where: { id } });
}
async function createInvestor(data) {
    const id = (0, uid_1.uid)('INV');
    return prisma_1.prisma.investor.create({
        data: {
            id,
            name: data.name,
            phone: data.phone,
            address: data.address,
            nidNo: data.nidNo,
            photoUrl: data.photoUrl,
            agreementPct: data.agreementPct,
            notes: data.notes,
            active: data.active ?? true,
        },
    });
}
async function updateInvestor(id, data) {
    return prisma_1.prisma.investor.update({
        where: { id },
        data: {
            name: data.name,
            phone: data.phone,
            address: data.address,
            nidNo: data.nidNo,
            photoUrl: data.photoUrl,
            agreementPct: data.agreementPct,
            notes: data.notes,
            active: data.active,
            updatedAt: new Date(),
        },
    });
}
async function deleteInvestor(id) {
    try {
        await prisma_1.prisma.investor.delete({ where: { id } });
        return true;
    }
    catch {
        return false;
    }
}
async function getInvestorTxns(investorId) {
    const where = investorId ? { investorId } : {};
    return prisma_1.prisma.investorTxn.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
}
async function createInvestorTxn(data) {
    const id = (0, uid_1.uid)('INVTX');
    return prisma_1.prisma.investorTxn.create({
        data: {
            id,
            investorId: data.investorId,
            kind: data.kind,
            date: new Date(data.date),
            amount: data.amount,
            instrument: data.instrument,
            memo: data.memo,
            voucherId: data.voucherId,
        },
    });
}
async function getInvestorBalance(investorId) {
    const txns = await getInvestorTxns(investorId);
    let capital = 0;
    let profitPaid = 0;
    for (const t of txns) {
        if (t.kind === 'capitalIn')
            capital += t.amount;
        if (t.kind === 'capitalOut')
            capital -= t.amount;
        if (t.kind === 'profitPay')
            profitPaid += t.amount;
    }
    return {
        capital: Math.round(capital * 100) / 100,
        profitPaid: Math.round(profitPaid * 100) / 100,
        net: Math.round((capital - profitPaid) * 100) / 100,
    };
}
