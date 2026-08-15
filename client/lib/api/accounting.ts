'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
	success?: boolean;
	message?: string;
	data?: T;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
	return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

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
	createdAt : string;
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

function unwrapList<T>(payload: ApiEnvelope<T[]>): T[] {
	return Array.isArray(payload.data) ? payload.data : [];
}

function unwrapOne<T>(payload: ApiEnvelope<T>): T {
	if (!payload.data) throw new Error(payload.message || 'Empty response');
	return payload.data;
}

export async function getAccounts(filterByType?: string): Promise<AccountDto[]> {
	const url = new URL(`${API_BASE_URL}/api/v1/accounting/accounts`);
	if (filterByType) url.searchParams.set('type', filterByType);
	const res = await apiFetch(url.toString(), {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<AccountDto[]>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch accounts');
	return unwrapList(payload);
}
 
export async function createAccount(input: CreateAccountInput): Promise<AccountDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/accounting/accounts`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(input),
	});
	const payload = await parseJson<AccountDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to create account');
	return unwrapOne(payload);
}

export async function getDaybook(date: string): Promise<DaybookDto> {
	const url = new URL(`${API_BASE_URL}/api/v1/accounting/daybook`);
	url.searchParams.set('date', date);
	const res = await apiFetch(url.toString(), {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<DaybookDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch daybook');
	return unwrapOne(payload);
}

export async function getCashbook(date: string): Promise<DaybookDto> {
	const url = new URL(`${API_BASE_URL}/api/v1/accounting/cashbook`);
	url.searchParams.set('date', date);
	const res = await apiFetch(url.toString(), {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<DaybookDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch cashbook');
	return unwrapOne(payload);
}
 
export async function getLedger(accountId: string, from?: string, to?: string): Promise<LedgerReportDto> {
	const url = new URL(`${API_BASE_URL}/api/v1/accounting/ledger`);
	url.searchParams.set('accountId', accountId);
	if (from) url.searchParams.set('from', from);
	if (to) url.searchParams.set('to', to);
	const res = await apiFetch(url.toString(), {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<LedgerReportDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch ledger');
	return unwrapOne(payload);
}

export async function getTrialBalance(): Promise<TrialBalanceDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/accounting/trial-balance`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<TrialBalanceDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch trial balance');
	return unwrapOne(payload);
}

export async function getExpenseSummary(year: number): Promise<ExpenseMonthSummaryDto[]> {
	const url = new URL(`${API_BASE_URL}/api/v1/accounting/expenses`);
	url.searchParams.set('year', String(year));
	const res = await apiFetch(url.toString(), {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<ExpenseMonthSummaryDto[]>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch expense summary');
	return unwrapList(payload);
}

export async function getReportMeta(): Promise<ReportMetaDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/accounting/report-meta`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<ReportMetaDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to fetch report metadata');
	return unwrapOne(payload);
}
 
export async function upsertPartyAccountOpening(payload: {
	partyKind: string;
	partyRefId: string;
	name: string;
	paona?: number;
	dena?: number;
}) {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/accounting/party-account/upsert-opening`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});

	const payloadJson = await parseJson<AccountDto>(res);
	if (!res.ok) throw new Error(payloadJson.message || 'Failed to update party opening');
	return unwrapOne(payloadJson);
}