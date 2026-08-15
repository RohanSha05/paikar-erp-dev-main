'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | { items?: T; rows?: T };
};

export type WarehouseDto = {
  id: string;
  code?: string;
  name: string;
  address?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export async function getWarehouses(): Promise<WarehouseDto[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/warehouses`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store'
  });

  const payload = await parseJson<WarehouseDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load warehouses');
  return unwrapList(payload);
}

export async function createWarehouse(input: {
  code: string;
  name: string;
  address?: string;
}): Promise<WarehouseDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/warehouses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input)
  });

  const payload = await parseJson<WarehouseDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create warehouse');

  const one = unwrapOne(payload);
  if (!one) throw new Error('Backend did not return warehouse');
  return one;
}
