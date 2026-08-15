'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
	success?: boolean;
	message?: string;
	data?: T | { items?: T; rows?: T };
};

export type DriverDto = {
	id: string;
	name: string;
	phone?: string;
	truckNo?: string;
	licenseNo?: string;
	active?: boolean;
	balance?: number;
	pawna?: number;
	dena?: number;
	createdAt?: string;
	updatedAt?: string;
};

export type DriverInput = {
	id?: string;
	name: string;
	phone?: string;
	truckNo?: string;
	licenseNo?: string;
	active?: boolean;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
	return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function unwrapList<T>(payload: ApiEnvelope<T[]>): T[] {
	if (Array.isArray(payload.data)) return payload.data;
	if (payload.data && 'items' in payload.data && Array.isArray(payload.data.items)) {
		return payload.data.items;
	}
	if (payload.data && 'rows' in payload.data && Array.isArray(payload.data.rows)) {
		return payload.data.rows;
	}
	return [];
}

function unwrapOne<T>(payload: ApiEnvelope<T>): T | null {
	if (!payload?.data || Array.isArray(payload.data)) return null;
	return payload.data as T;
}

export async function getDrivers(): Promise<DriverDto[]> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/drivers`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store'
	});

	const payload = await parseJson<DriverDto[]>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to load drivers');
	}

	return unwrapList(payload);
}

export async function createDriver(input: DriverInput): Promise<DriverDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/drivers`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(input)
	});

	const payload = await parseJson<DriverDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to create driver');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return driver');
	return one;
}

export async function updateDriver(
	id: string,
	input: Omit<DriverInput, 'id'>
): Promise<DriverDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/drivers/${id}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(input)
	});

	const payload = await parseJson<DriverDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to update driver');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return driver');
	return one;
}