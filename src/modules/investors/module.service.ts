import { prisma } from '../../db/prisma';
import { Investor, InvestorTxn, InvestorBalance } from './module.types';
import { uid } from '../../common/utils/uid';

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
  photoUrl?: string;
  agreementPct?: number;
  notes?: string;
  active?: boolean;
}): Promise<Investor> {
  const id = uid('INV');
  return prisma.investor.create({
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

export async function updateInvestor(id: string, data: Partial<Investor>): Promise<Investor | null> {
  return prisma.investor.update({
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
}): Promise<InvestorTxn> {
  const id = uid('INVTX');
  return prisma.investorTxn.create({
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

export async function getInvestorBalance(investorId: string): Promise<InvestorBalance> {
  const txns = await getInvestorTxns(investorId);

  let capital = 0;
  let profitPaid = 0;

  for (const t of txns) {
    if (t.kind === 'capitalIn') capital += t.amount;
    if (t.kind === 'capitalOut') capital -= t.amount;
    if (t.kind === 'profitPay') profitPaid += t.amount;
  }

  return {
    capital: Math.round(capital * 100) / 100,
    profitPaid: Math.round(profitPaid * 100) / 100,
    net: Math.round((capital - profitPaid) * 100) / 100,
  };
}
