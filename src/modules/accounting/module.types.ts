export interface AccountDto {
	id: string;
	code: string;
	name: string;
	type: string; 
	partyKind?: string;
	partyRefId?: string;
	active: boolean;
	opening?: number;
  openingDr?: number;
  openingCr?: number;
}

export interface CreateAccountInput {
	code?: string;
	name: string;
	type: string;
	 opening?: number;
  openingDr?: number;
  openingCr?: number;
	active?: boolean;
	partyKind?: string;
	partyRefId?: string;
	bankInfo?: string;
}

export interface LedgerRowDto {
	vId: string;
	date: string;
	memo?: string;
	dr: number;
	cr: number;
	balance: number;
	createdAt: string;
}

export interface LedgerReportDto {
	account: AccountDto;
	opening: number;
	closing: number;
	rows: LedgerRowDto[];
}

export interface DaybookRowDto {
	id: string;
	voucherNo: string;
	vtype: string;
	vdate: string;
	narration?: string;
	rows: Array<{
		id: string;
		accountId: string;
		account?: AccountDto;
		dr: number;
		cr: number;
		memo?: string;
	}>;
	debit: number;
	credit: number;
}

export interface DaybookDto {
	opening: number;
	closing: number;
	list: DaybookRowDto[];
	totals: {
		debit: number;
		credit: number;
	};
}

export interface TrialBalanceRowDto {
	id: string;
	code: string;
	name: string;
	type: string;
	opening: number;
	dr: number;
	cr: number;
	balance: number;
}

export interface TrialBalanceDto {
	rows: TrialBalanceRowDto[];
	totals: {
		dr: number;
		cr: number;
	};
}

export interface ExpenseMonthSummaryDto {
	month: number;
	fixed: number;
	variable: number;
	total: number;
}

export interface ReportMetaDto {
	latestVoucherDate: string | null;
	latestVoucherYear: number | null;
}
