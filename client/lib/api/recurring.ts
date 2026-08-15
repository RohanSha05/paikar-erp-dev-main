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

export interface RecurringTemplateDto {
	id: string;
	name: string;
	expenseAccountId: string;
	payFromAccountId?: string;
	amount: number;
	frequency: 'monthly' | 'daily';
	dayOfMonth?: number;
	active: boolean;
	notes?: string;
	lastPostedDate?: string;
	createdAt: string;
	updatedAt: string;
}

export interface RecurringTemplateInput {
	name: string;
	expenseAccountId: string;
	payFromAccountId?: string;
	amount: number;
	frequency: 'monthly' | 'daily';
	dayOfMonth?: number;
	active?: boolean;
	notes?: string;
}

export async function getRecurringTemplates(): Promise<RecurringTemplateDto[]> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/recurring/templates`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store',
	});
	const payload = await parseJson<RecurringTemplateDto[]>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to load recurring templates');
	return Array.isArray(payload.data) ? payload.data : [];
}

export async function createRecurringTemplate(input: RecurringTemplateInput): Promise<RecurringTemplateDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/recurring/templates`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(input),
	});
	const payload = await parseJson<RecurringTemplateDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to create recurring template');
	if (!payload.data) throw new Error('Backend did not return recurring template');
	return payload.data;
}

export async function updateRecurringTemplate(id: string, input: Partial<RecurringTemplateInput>): Promise<RecurringTemplateDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/recurring/templates/${id}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(input),
	});
	const payload = await parseJson<RecurringTemplateDto>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to update recurring template');
	if (!payload.data) throw new Error('Backend did not return recurring template');
	return payload.data;
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/recurring/templates/${id}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	});
	const payload = await parseJson<null>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to delete recurring template');
}

export async function postRecurringTemplate(
	id: string,
	year: number,
	month: number,
	postDate?: string,
): Promise<{ voucherId: string; voucherNo: string }> {
	const url = new URL(`${API_BASE_URL}/api/v1/recurring/templates/${id}/post`);
	url.searchParams.set('year', String(year));
	url.searchParams.set('month', String(month));
	if (postDate) {
		url.searchParams.set('postDate', postDate);
	}
	const res = await apiFetch(url.toString(), {
		method: 'POST',
		headers: getAuthHeaders(),
	});
	const payload = await parseJson<{ voucherId: string; voucherNo: string }>(res);
	if (!res.ok) throw new Error(payload.message || 'Failed to post recurring template');
	if (!payload.data) throw new Error('Backend did not return post result');
	return payload.data;
}
