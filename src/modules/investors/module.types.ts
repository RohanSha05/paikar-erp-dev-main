export interface Investor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  nidNo?: string;
  photoUrl?: string;
  agreementPct?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface InvestorTxn {
  id: string;
  investorId: string;
  kind: 'capitalIn' | 'capitalOut' | 'profitPay' | 'adjustment' | 'payout';
  date: string;
  amount: number;
  instrument?: string;
  memo?: string;
  voucherId?: string;
  createdAt: string;
}

export interface InvestorBalance {
  capital: number;
  profitPaid: number;
  net: number;
}
