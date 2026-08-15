import { apiFetch } from './fetchWithTimeout';
import { getAuthHeaders } from '../auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function isDecimalLike(value: unknown) {
  return !!value && typeof value === 'object' && 's' in value && 'e' in value && 'd' in value;
}

function sanitizeRetailDraftValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRetailDraftValue(item)) as T;
  }

  if (isDecimalLike(value)) {
    const numeric = Number((value as { toString?: () => string }).toString?.());
    return (Number.isFinite(numeric) ? numeric : String(value)) as T;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeRetailDraftValue(entry),
      ]),
    ) as T;
  }

  return value;
}

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

export interface RetailPurchaseDraftInput {
  date: string;
  sellerId?: string;
  market?: string;
  mon: number;
  price: number;
  notes?: string;
  paidAmount: number;
  dueAmount: number;
  isDue: boolean;
  sellerName?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerDistrict?: string;
  sellerMarket?: string;
  productId?: string;
  productName?: string;
  productCategory?: string;
}

export async function createRetailPurchaseDraft(input: RetailPurchaseDraftInput) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/retail-purchase-drafts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const payload = await parseJson<any>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create retail purchase draft');
  return {
    ...payload,
    data: sanitizeRetailDraftValue(payload?.data ?? payload),
  };
}

export async function listRetailPurchaseDrafts(date: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/retail-purchase-drafts?date=${date}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const payload = await parseJson<any>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to fetch retail purchase drafts');
  return {
    ...payload,
    data: sanitizeRetailDraftValue(payload?.data ?? []),
  };
}

export async function finalizeRetailPurchaseDrafts(date: string, warehouseId: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/retail-purchase-drafts/finalize`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ date, warehouseId }),
  });
  const payload = await parseJson<any>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to finalize retail purchase drafts');
  return {
    ...payload,
    data: sanitizeRetailDraftValue(payload?.data ?? payload),
  };
}

export async function updateRetailPurchaseDraft(id: string, input: Partial<RetailPurchaseDraftInput>) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/retail-purchase-drafts/${id}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
  const payload = await parseJson<any>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update retail purchase draft');
  return {
    ...payload,
    data: sanitizeRetailDraftValue(payload?.data ?? payload),
  };
}

export async function deleteRetailPurchaseDraft(id: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/retail-purchase-drafts/${id}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  const payload = await parseJson<any>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete retail purchase draft');
  return {
    ...payload,
    data: sanitizeRetailDraftValue(payload?.data ?? payload),
  };
}
