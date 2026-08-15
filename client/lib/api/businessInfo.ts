'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
	success?: boolean;
	message?: string;
	data?: T | { items?: T; rows?: T };
};

export type BusinessInfoDto = {
	id: string;
	businessName?: string | null;
	proprietorName?: string | null;
	additionalProprietor?: string | null;
	address?: string | null;
	phone1?: string | null;
	phone2?: string | null;
	operationPass?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

export type BusinessInfoInput = {
	id?: string;
	businessName?: string | null;
	proprietorName?: string | null;
	additionalProprietor?: string | null;
	address?: string | null;
	phone1?: string | null;
	phone2?: string | null;
	operationPass?: string | null;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
	return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function unwrapOne<T>(payload: ApiEnvelope<T>): T | null {
	if (!payload?.data || Array.isArray(payload.data)) return null;
	return payload.data as T;
}

function cleanInputData(input: BusinessInfoInput): BusinessInfoInput {
	// Convert empty strings to null for proper handling
	return {
		...input,
		businessName: input.businessName?.trim() || null,
		proprietorName: input.proprietorName?.trim() || null,
		additionalProprietor: input.additionalProprietor?.trim() || null,
		address: input.address?.trim() || null,
		phone1: input.phone1?.trim() || null,
		phone2: input.phone2?.trim() || null,
		operationPass: input.operationPass?.trim() || null,
	};
}

export async function getBusinessInfo(): Promise<BusinessInfoDto | null> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/business-info`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store'
	});

	const payload = await parseJson<BusinessInfoDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to load business info');
	}

	return unwrapOne(payload);
}

export async function createOrUpdateBusinessInfo(input: BusinessInfoInput): Promise<BusinessInfoDto> {
	const cleanedInput = cleanInputData(input);
	const res = await apiFetch(`${API_BASE_URL}/api/v1/business-info`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(cleanedInput)
	});

	const payload = await parseJson<BusinessInfoDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to save business info');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return business info');
	return one;
}

export async function updateBusinessInfo(
	id: string,
	input: Omit<BusinessInfoInput, 'id'>
): Promise<BusinessInfoDto> {
	const cleanedInput = cleanInputData(input as BusinessInfoInput);
	const res = await apiFetch(`${API_BASE_URL}/api/v1/business-info/${id}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(cleanedInput)
	});

	const payload = await parseJson<BusinessInfoDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to update business info');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return business info');
	return one;
}

export async function deleteBusinessInfo(id: string): Promise<void> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/business-info/${id}`, {
		method: 'DELETE',
		headers: getAuthHeaders()
	});

	const payload = await parseJson<BusinessInfoDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to delete business info');
	}
}
