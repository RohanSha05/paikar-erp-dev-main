export interface AccountDto {
	id: string;
	code: string;
	name: string;
	type: string;
	active: boolean;
	opening?: number;
}

export interface CreateAccountInput {
	code?: string;
	name: string;
	type: string;
	opening?: number;
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
}

export interface LedgerReportDto {
	account: AccountDto;
	opening: number;
	closing: number;
	rows: LedgerRowDto[];
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
