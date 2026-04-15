export interface Investor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  nidNo: string | null;
  photoUrl: string | null;
  agreementPct: number | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestorTxn {
  id: string;
  investorId: string;
  kind: string;
  date: Date;
  amount: number;
  instrument: string | null;
  memo: string | null;
  voucherId: string | null;
  createdAt: Date;
}

export interface InvestorBalance {
  capital: number;
  profitPaid: number;
  net: number;
}
