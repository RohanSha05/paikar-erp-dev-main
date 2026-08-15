'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
	success?: boolean;
	message?: string;
	data?: T | { items?: T; rows?: T };
};

export type DriverTripDto = {
	id: string;
	driverId: string;
	driverName?: string;
	date: string;
	route?: string;
	truckNo?: string;
	amount: number | string;
	memo?: string;
	settled?: boolean;
	settledAt?: string | null;
	poId?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type CreateDriverTripInput = {
	id?: string;
	driverId: string;
	driverName?: string;
	date: string;
	route?: string;
	truckNo?: string;
	amount: number;
	memo?: string;
	poId?: string;
};

export async function settleDriverTrip(
	tripId: string,
	input: {
		payAccountId?: string;
		payNowAmount?: number;
		memo?: string;
		settledAt?: string | null;
	} = {},
): Promise<DriverTripDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/driver-trips/${tripId}/settle`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(input),
	});

	const payload = await parseJson<DriverTripDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to settle driver trip');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return settled driver trip');
	return one;
}

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

export async function getDriverTrips(): Promise<DriverTripDto[]> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/driver-trips`, {
		method: 'GET',
		headers: getAuthHeaders(),
		cache: 'no-store'
	});

	const payload = await parseJson<DriverTripDto[]>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to load driver trips');
	}

	return unwrapList(payload);
}

export async function createDriverTrip(input: CreateDriverTripInput): Promise<DriverTripDto> {
	const res = await apiFetch(`${API_BASE_URL}/api/v1/driver-trips`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(input)
	});

	const payload = await parseJson<DriverTripDto>(res);
	if (!res.ok) {
		throw new Error(payload?.message || 'Failed to create driver trip');
	}

	const one = unwrapOne(payload);
	if (!one) throw new Error('Backend did not return driver trip');
	return one;
}