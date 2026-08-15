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

export interface InvestorDto {
	id: string;
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
	active: boolean;
	createdAt: string;
	updatedAt?: string;
}

export interface InvestorTxnDto {
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

export interface InvestorBalanceDto {
	capital: number;
	profitPaid: number;
	adjustment: number;
	payout: number;
	net: number;
}

export async function listInvestors(): Promise<InvestorDto[]> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors`, {
		headers: getAuthHeaders(),
	});
	const result = await parseJson<InvestorDto[]>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to fetch investors');
	return result.data || [];
}

export async function getInvestor(id: string): Promise<InvestorDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors/${id}`, {
		headers: getAuthHeaders(),
	});
	const result = await parseJson<InvestorDto>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to fetch investor');
	if (!result.data) throw new Error('Investor not found');
	return result.data;
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
}): Promise<InvestorDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(data),
	});
	const result = await parseJson<InvestorDto>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to create investor');
	if (!result.data) throw new Error('No data in response');
	return result.data;
}

export async function updateInvestor(
	id: string,
	data: Partial<InvestorDto>
): Promise<InvestorDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors/${id}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(data),
	});
	const result = await parseJson<InvestorDto>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to update investor');
	if (!result.data) throw new Error('No data in response');
	return result.data;
}

export async function deleteInvestor(id: string): Promise<void> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors/${id}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	});
	if (!res.ok) {
		const result = await parseJson<void>(res);
		throw new Error(result.message || 'Failed to delete investor');
	}
}

export async function getInvestorTxns(investorId?: string): Promise<InvestorTxnDto[]> {
	const url = investorId
		? `${API_BASE_URL}/api/v1/investors/${investorId}/txns`
		: `${API_BASE_URL}/api/v1/investors/txns`;
	const res = await apiFetch(url, {
		headers: getAuthHeaders(),
	});
	const result = await parseJson<InvestorTxnDto[]>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to fetch transactions');
	return result.data || [];
}

export async function postInvestorTxn(
	investorId: string,
	data: {
		kind: 'capitalIn' | 'capitalOut' | 'profitPay' | 'adjustment' | 'payout';
		amount: number;
		date?: string;
		instrument?: string;
		memo?: string;
		payAccountId?: string;
	}
): Promise<InvestorTxnDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors/${investorId}/txns`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(data),
	});
	const result = await parseJson<InvestorTxnDto>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to post transaction');
	if (!result.data) throw new Error('No data in response');
	return result.data;
}

export async function getInvestorBalance(investorId: string): Promise<InvestorBalanceDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/investors/${investorId}/balance`, {
		headers: getAuthHeaders(),
	});
	const result = await parseJson<InvestorBalanceDto>(res);
	if (!res.ok) throw new Error(result.message || 'Failed to fetch balance');
	if (!result.data) throw new Error('No balance data');
	return result.data;
}
