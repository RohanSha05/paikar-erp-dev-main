import { prisma } from '../../db/prisma';
import { Investor, InvestorTxn, InvestorBalance } from './module.types';
import { ensurePartyAccount } from '../accounting/party-account';
import { createVoucher } from '../cashbook/module.service';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';

export async function listInvestors(): Promise<Investor[]> {
  return prisma.investor.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInvestor(id: string): Promise<Investor | null> {
  return prisma.investor.findUnique({ where: { id } });
}

export async function createInvestor(data: {
  name: string;
  phone?: string;
  address?: string;
  nidNo?: string;
  nid?: string;
  nomineeName?: string;
  startDate?: string;
  photoUrl?: string;
  agreementPct?: number;
  profitSharePct?: number;
  notes?: string;
  active?: boolean;
}): Promise<Investor> {
  const id = await nextDailySequenceIdForDelegate(prisma.investor, 'id', 'INV');
  const effectiveNidNo = data.nidNo ?? data.nid;
  const effectiveAgreementPct = data.agreementPct ?? data.profitSharePct;
  const investor = await prisma.investor.create({
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
      active: data.active ?? true,
    },
  });

  await ensurePartyAccount({
    kind: 'investor',
    refId: investor.id,
    name: investor.name,
    type: 'party',
  });

  return investor;
}

export async function updateInvestor(id: string, data: Partial<Investor>): Promise<Investor | null> {
  const anyData = data as Partial<Investor> & {
    nid?: string;
    profitSharePct?: number;
    startDate?: string | Date | null;
  };

  const effectiveNidNo = data.nidNo ?? anyData.nid;
  const effectiveAgreementPct = data.agreementPct ?? anyData.profitSharePct;
  const effectiveStartDate =
    typeof anyData.startDate === 'string'
      ? new Date(anyData.startDate)
      : anyData.startDate;

  const investor = await prisma.investor.update({
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

  await ensurePartyAccount({
    kind: 'investor',
    refId: investor.id,
    name: investor.name,
    type: 'party',
  });

  return investor;
}

export async function deleteInvestor(id: string): Promise<boolean> {
  try {
    await prisma.investor.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getInvestorTxns(investorId?: string): Promise<InvestorTxn[]> {
  const where = investorId ? { investorId } : {};
  return prisma.investorTxn.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createInvestorTxn(data: {
  investorId: string;
  kind: 'capitalIn' | 'capitalOut' | 'profitPay' | 'adjustment' | 'payout';
  date: string;
  amount: number;
  instrument?: string;
  memo?: string;
  voucherId?: string;
  payAccountId?: string;
}): Promise<InvestorTxn> {
  const investor = await prisma.investor.findUnique({ where: { id: data.investorId } });
  if (!investor) {
    throw new Error('Investor not found');
  }

  const investorAccount = await ensurePartyAccount({
    kind: 'investor',
    refId: investor.id,
    name: investor.name,
    type: 'party',
  });

  const amount = Number(data.amount || 0);
  const payAccountId = data.payAccountId || data.instrument || 'AC-CASH';
  const defaultMemoByKind: Record<typeof data.kind, string> = {
    capitalIn: 'Capital In',
    capitalOut: 'Capital Out',
    profitPay: 'Profit Distribution',
    adjustment: 'Adjustment',
    payout: 'Payout',
  };
  const memo = data.memo?.trim() || defaultMemoByKind[data.kind];

  const rows =
    data.kind === 'capitalIn'
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

  const voucher = await createVoucher({
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

  const id = await nextDailySequenceIdForDelegate(prisma.investorTxn, 'id', 'INVTX');
  return prisma.investorTxn.create({
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
}

export async function getInvestorBalance(investorId: string): Promise<InvestorBalance> {
  const txns = await getInvestorTxns(investorId);

  let capital = 0;
  let profitPaid = 0;
  let adjustment = 0;
  let payout = 0;

  for (const t of txns) {
    if (t.kind === 'capitalIn') capital += t.amount;
    if (t.kind === 'capitalOut') capital -= t.amount;
    if (t.kind === 'profitPay') profitPaid += t.amount;
    if (t.kind === 'adjustment') adjustment += t.amount;
    if (t.kind === 'payout') payout += t.amount;
  }

  return {
    capital: Math.round(capital * 100) / 100,
    profitPaid: Math.round(profitPaid * 100) / 100,
    adjustment: Math.round(adjustment * 100) / 100,
    payout: Math.round(payout * 100) / 100,
    net: Math.round((capital - profitPaid - adjustment - payout) * 100) / 100,
  };
}
