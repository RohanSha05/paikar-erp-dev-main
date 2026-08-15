import { Seller } from './../mockdb';
'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';
const ENABLE_PO_LIST_API =
  process.env.NEXT_PUBLIC_ENABLE_PO_LIST_API !== 'false';
const ENABLE_PO_APPROVE_API =
  process.env.NEXT_PUBLIC_ENABLE_PO_APPROVE_API !== 'false';

export type CreatePurchaseOrderDraftInput = {
  purchaseType?: 'district' | 'trolley' | 'retail';
  sellerId: string;
  sellerSnapshot?: {
    id: string;
    name: string;
    address?: string;
    district?: string;
    market?: string;
    phone?: string;
  };
  warehouseId: string;
  warehouseName?: string;
  transport: number;
  transportMode?: 'sellerIncluded' | 'marketTruck' | 'ownTruck';
  loading: number;
  misc: number;
  advancePaid?: number;
  advanceInstrumentId?: string;
  bagCostMode?: "paid" | "self" | "mixed";
  bagCostPerBag: number;
  paidBags?: number;
  loadingUnloading?: number;
  remarks?: string;
  varietyNote?: string;
  destinationKind?: 'warehouse' | 'mill';
  destinationWarehouseId?: string | null;
  destinationCustomerId?: string | null;
  destinationRef?: {
    type: 'warehouse' | 'mill';
    id: string;
    name?: string;
  } | null;
  driverId?: string;
  driverName?: string;
  truckNo?: string;
  route?: string;
  items: Array<{
    id?: string;
    productId: string;
    productType?: string;
    bagCount: number;
    actualKgPerBag: number;
    accountingKgPerBag: number;
    weightPolicy: 'actual' | 'accounting';
    rateBasis: 'perKg' | 'perMon'| 'perBag';
    rateValue: number;
  }>;
};

export type PurchaseOrderDraftDto = {
  id: string;
  poNo?: string;
  status?: string;
  createdAt?: string;
};

export type PurchaseOrderListItemDto = {
  id: string;
  poNo?: string;
  status?: string;
  soldState?: 'none' | 'partial' | 'full';
  initialStockKg?: number;
  remainingStockKg?: number;
  createdAt?: string;
  sellerId?: string;
  sellerSnapshot?: {
    id?: string;
    name?: string;
  };
  advancePaid?: number;
  advanceInstrumentId?: string;
  totalCost?: number;
  totals?: {
    totalCost?: number;
  };
};

export type PurchaseOrderDetailsDto = PurchaseOrderListItemDto & {
  purchaseType?: 'district' | 'trolley' | 'retail';
  productType?: string;
  rateBasis?: 'perKg' | 'perMon';
  rateValue?: number;
  bagCount?: number;
  actualKgPerBag?: number;
  accountingKgPerBag?: number;
  weightPolicy?: 'actual' | 'accounting';
  transport?: number;
  advancePaid?: number;
  advanceInstrumentId?: string;
  bagCostMode?: 'paid' | 'self';
  bagCostPerBag?: number;
  loadingUnloading?: number;
  misc?: number;
  remarks?: string;
  varietyNote?: string;
  sellerSnapshot?: {
    id?: string;
    name?: string;
    district?: string;
    market?: string;
    address?: string;
  };
  seller?:{
      id : String  ;
  name :String;
  address: String;
  district: String;
  market :String;
  phone  : String;
  nidNumber: String;
emergencyPhone: String;
  }
  warehouse?: string | { id?: string; name?: string; code?: string };
  destinationKind?: 'warehouse' | 'mill';
  destinationWarehouseId?: string | null;
  destinationCustomerId?: string | null;
  lots?: Array<{
    id?: string;
    label?: string;
    lotNo?: string;
    availableKg?: number;
    sourcePoItemId?: string;
    product?: {
      id?: string;
      name?: string;
    };
    warehouse?: {
      id?: string;
      name?: string;
    };
  }>;
  items?: Array<{
    id?: string;
    productId?: string;
    productType?: string;
    productName?: string;
    product?: {
      name?: string;
    };
    bagCount?: number;
    actualKgPerBag?: number;
    accountingKgPerBag?: number;
    weightPolicy?: 'actual' | 'accounting';
    rateBasis?: 'perKg' | 'perMon';
    rateValue?: number;
  }>;
};

export type UpdatePurchaseOrderDraftInput = CreatePurchaseOrderDraftInput;
export type UpdatePurchaseOrderInput = CreatePurchaseOrderDraftInput & {
  editPassword?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function normalizeStatus(status?: string) {
  return typeof status === 'string' ? status.toLowerCase() : status;
}

function isDecimalLike(value: unknown) {
  return !!value && typeof value === 'object' && 's' in value && 'e' in value && 'd' in value;
}

function sanitizePurchaseValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePurchaseValue(item)) as T;
  }

  if (isDecimalLike(value)) {
const numeric = Number((value as { toString?: () => string }).toString?.());
    return (Number.isFinite(numeric) ? numeric : String(value)) as T;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizePurchaseValue(entry),
      ]),
    ) as T;
  }

  return value;
}

function normalizePurchase<T extends { status?: string }>(value: T): T {
  const sanitized = sanitizePurchaseValue(value);
  return {
    ...sanitized,
    status: normalizeStatus(sanitized.status),
  };
}

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

export async function createPurchaseOrderDraft(
  input: CreatePurchaseOrderDraftInput
): Promise<PurchaseOrderDraftDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/purchase-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<PurchaseOrderDraftDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to save purchase draft');
  return normalizePurchase((payload?.data ?? payload) as PurchaseOrderDraftDto);
}

function unwrapList<T>(payload: ApiEnvelope<T[]>): T[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object' && 'items' in payload.data) {
    const items = (payload.data as { items?: T[] }).items;
    if (Array.isArray(items)) return items;
  }
  if (payload.data && typeof payload.data === 'object' && 'rows' in payload.data) {
    const rows = (payload.data as { rows?: T[] }).rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function unwrapOne<T>(payload: ApiEnvelope<T>): T | null {
  return payload?.data || null;
}

export async function getPurchaseOrders(limit?: number): Promise<PurchaseOrderListItemDto[]> {
  // Your current backend contract only has POST /purchase-orders.
  // Enable this when GET /purchase-orders is implemented.
  if (!ENABLE_PO_LIST_API) return [];

  const url = new URL(`${API_BASE_URL}/api/v1/purchase-orders`);
  if (limit !== undefined) url.searchParams.append('limit', String(limit));

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  // Some backends may not yet expose GET /purchase-orders; return [] instead of hard-failing dashboard.
  if (res.status === 404) return [];

  const payload = await parseJson<PurchaseOrderListItemDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load purchase orders');
  return unwrapList(payload).map((row) => normalizePurchase(row as PurchaseOrderListItemDto));
}

export async function getPurchaseOrderById(
  id: string
): Promise<PurchaseOrderDetailsDto | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/purchase-orders/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (res.status === 404) {
    const list = await getPurchaseOrders();
    return (list.find((p) => p.id === id) as PurchaseOrderDetailsDto | undefined) || null;
  }

  const payload = await parseJson<PurchaseOrderDetailsDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load purchase order');
  const one = unwrapOne(payload);
  return one ? normalizePurchase(one as PurchaseOrderDetailsDto) : null;
}

export async function approvePurchaseOrder(
  id: string
): Promise<{ id?: string; status?: string; alreadyApproved?: boolean }>
{
  if (!ENABLE_PO_APPROVE_API) {
    throw new Error('PO approve API is disabled');
  }

  const res = await apiFetch(`${API_BASE_URL}/api/v1/purchase-orders/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<{ id?: string; status?: string; alreadyApproved?: boolean }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to approve purchase order');
  return normalizePurchase(
    (payload?.data && !Array.isArray(payload.data) ? payload.data : payload) as {
    id?: string;
    status?: string;
    alreadyApproved?: boolean;
  }
  );
}

export async function updatePurchaseOrderDraft(
  id: string,
  input: UpdatePurchaseOrderInput
): Promise<PurchaseOrderDetailsDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/purchase-orders/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<PurchaseOrderDetailsDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update purchase draft');

  const maybeWrapped = unwrapOne(payload);
  const value = (maybeWrapped || (payload as unknown as PurchaseOrderDetailsDto)) as PurchaseOrderDetailsDto;
  return normalizePurchase(value);
}

export async function deletePurchaseOrder(
  id: string,
  editPassword?: string
): Promise<{ id: string }> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/purchase-orders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ editPassword }),
  });

  const payload = await parseJson<{ id: string }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete purchase order');
  return unwrapOne(payload) || { id };
}
