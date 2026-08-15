'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

export type ProductDto = {
  id: string;
  name: string;
  code: string;
  category?: string;
  unit: 'kg' | 'mon' | 'bag';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

export async function getProducts(): Promise<ProductDto[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/products`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  const payload = await parseJson<ProductDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load products');
  return payload?.data || [];
}

export async function createProduct(input: {
  name: string;
  code: string;
  category?: string;
  unit: 'kg' | 'mon' | 'bag';
  active: boolean;
}): Promise<ProductDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ProductDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create product');
  if (!payload?.data) throw new Error('Backend did not return product');
  return payload.data;
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    category?: string;
    unit?: 'kg' | 'mon' | 'bag';
    active?: boolean;
  }
): Promise<ProductDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/products/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ProductDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update product');
  if (!payload?.data) throw new Error('Backend did not return product');
  return payload.data;
}

export async function updateProductStatus(
  id: string,
  active: boolean
): Promise<ProductDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/products/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ active }),
  });

  const payload = await parseJson<ProductDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update product status');
  if (!payload?.data) throw new Error('Backend did not return product');
  return payload.data;
}
