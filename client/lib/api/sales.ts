'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | { items?: T; rows?: T };
};

function normalizeStatus(status?: string) {
  return typeof status === 'string' ? status.toLowerCase() : status;
}

function normalizeSalesOrder<T extends {
  status?: string;
  transport?: unknown;
  loadingUnloading?: unknown;
  misc?: unknown;
  total?: unknown;
  totalsJson?: unknown;
  totals?: unknown;
  items?: unknown;
}>(value: T): T {
  const sourceTotals = value.totals ?? value.totalsJson;
  const totals = sourceTotals && typeof sourceTotals === 'object'
    ? {
        ...(sourceTotals as Record<string, unknown>),
        base: toFiniteNumber((sourceTotals as Record<string, unknown>).base),
        extras: toFiniteNumber((sourceTotals as Record<string, unknown>).extras),
        total: toFiniteNumber((sourceTotals as Record<string, unknown>).total),
        totalKg: toFiniteNumber((sourceTotals as Record<string, unknown>).totalKg),
        avgPerKg: toFiniteNumber((sourceTotals as Record<string, unknown>).avgPerKg),
        avgPerMon: toFiniteNumber((sourceTotals as Record<string, unknown>).avgPerMon),
      }
    : sourceTotals;

  const items = Array.isArray(value.items)
    ? value.items.map((item: any) => ({
        ...item,
        qtyKg: toFiniteNumber(item?.qtyKg),
        rateValue: toFiniteNumber(item?.rateValue),
        bagCount: toFiniteNumber(item?.bagCount),
        kgPerBag: item?.kgPerBag === undefined ? undefined : toFiniteNumber(item?.kgPerBag),
        lot: item?.lot
          ? {
              ...item.lot,
              availableKg: item.lot.availableKg === undefined ? undefined : toFiniteNumber(item.lot.availableKg),
              avgCostPerKg: item.lot.avgCostPerKg === undefined ? undefined : toFiniteNumber(item.lot.avgCostPerKg),
            }
          : item?.lot,
      }))
    : value.items;

  return {
    ...value,
    status: normalizeStatus(value.status),
    transport: toFiniteNumber(value.transport),
    loadingUnloading: toFiniteNumber(value.loadingUnloading),
    misc: toFiniteNumber(value.misc),
    total: toFiniteNumber(value.total),
    totals,
    totalsJson: totals,
    items,
  };
}

export type SalesOrderItemDto = {
  id?: string;
  lotId: string;
  productType: string;
  qtyKg: number;
  rateBasis: 'perKg' | 'perMon' | 'perBag';
  rateValue: number;
  kgPerBag?: number;
  lot?: {
    id?: string;
    label?: string;
    availableKg?: number;
    avgCostPerKg?: number;
  };
  bagCount: Number;
};

export type LotDto = {
  id: string;
  label?: string;
  productType?: string;
  productId?: string;
  warehouseId?: string;
  availableKg?: number;
  avgCostPerKg?: number;
  createdAt?: string;
  product?: {
    id?: string;
    name?: string;
  };
  warehouse?: {
    id?: string;
    name?: string;
  };
  sourcePo?: {
    id?: string;
    poNo?: string;
    destinationCustomerId?: string;
    destinationCustomer?: {
      id?: string;
      name?: string;
      district?: string;
      market?: string;
      address?: string;
      phone?: string;
      type?: string;
    };
  };
  stockMoves?: Array<{
    id?: string;
    moveNo?: string;
    createdAt?: string;
    refType?: string;
    refId?: string;
    lotId?: string;
    lotLabel?: string;
    warehouseId?: string;
    qtyKg?: number;
  }>;
  meta?: {
    kgPerBag?: number;
    bagCount?: number;
    initialBagCount?: number;
    remainingBagCount?: number;
    poId?: string;
    warehouseId?: string;
    warehouseName?: string;
  };
};

export type GetLotsParams = {
  available?: boolean;
  limit?: number;
  search?: string;
  productCategory?: string;
  productName?: string;
  customerId?: string;
  timeoutMs?: number;
};

export type SalesOrderDto = {
  id: string;
  soNo?: string;
  status?: 'draft' | 'confirmed' | 'cancelled' | string;
  customerId?: string;
  customerSnapshot?: {
    id?: string;
    name?: string;
    district?: string;
    market?: string;
    address?: string;
    phone?: string;
    type?: 'mill' | 'retailer' | 'other' | string;
  };
  customer?: {
    id?: string;
    name?: string;
    district?: string;
    market?: string;
    address?: string;
  };
  items?: SalesOrderItemDto[];
  transport?: number;
  loadingUnloading?: number;
  misc?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  totals?: {
    base?: number;
    extras?: number;
    total?: number;
    totalKg?: number;
    avgPerKg?: number;
    avgPerMon?: number;
  };
  total?: number;
};

export type CreateSalesOrderInput = {
  customerId: string;
  customerSnapshot?: {
    id?: string;
    name?: string;
    district?: string;
    market?: string;
    address?: string;
    phone?: string;
  };
  transport: number;
  loadingUnloading: number;
  misc: number;
  remarks?: string;
  editPassword?: string;
  items: Array<{
    id?: string;
    lotId: string;
    productType: string;
    qtyKg: number;
    rateBasis: 'perKg' | 'perMon' | 'perBag';
    rateValue: number;
    bagCount: Number;
    kgPerBag?: number;
  }>;
};

export type SalesOrderDraftCreatedDto = {
  id: string;
  soNo?: string;
  status?: string;
  createdAt?: string;
};

export type SalesOrderUpdatedDto = {
  id: string;
  soNo?: string;
  status?: string;
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object') {
    const maybe = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybe.toNumber === 'function') {
      const parsed = maybe.toNumber();
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof maybe.toString === 'function') {
      const text = maybe.toString();
      if (text !== '[object Object]') {
        const parsed = Number.parseFloat(text);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
    }

    const decimalLike = value as {
      d?: unknown;
      e?: unknown;
      s?: unknown;
    };
    if (Array.isArray(decimalLike.d) && typeof decimalLike.e === 'number') {
      const chunks = decimalLike.d
        .map((chunk, index) => String(Math.abs(Number(chunk || 0))))
        .filter((chunk) => chunk.length > 0);
      if (chunks.length) {
        const coefficient = chunks[0] + chunks.slice(1).map((chunk) => chunk.padStart(7, '0')).join('');
        const sign = decimalLike.s === -1 ? -1 : 1;
        const digits = coefficient.replace(/^0+/, '') || '0';
        if (digits === '0') return 0;
        const exponent = decimalLike.e;
        const scaled = Number(digits) * Math.pow(10, exponent - digits.length + 1);
        if (Number.isFinite(scaled)) return sign * scaled;
      }
    }
  }
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLot(row: LotDto): LotDto {
  const kgPerBag = toFiniteNumber(row.meta?.kgPerBag);
  const initialBagCount = toFiniteNumber(row.meta?.initialBagCount, NaN);
  const bagCount = toFiniteNumber(row.meta?.bagCount, NaN);
  const remainingBagCount = toFiniteNumber(row.meta?.remainingBagCount, NaN);
  const liveBagCount = Number.isFinite(remainingBagCount)
    ? remainingBagCount
    : Number.isFinite(bagCount)
      ? bagCount
      : Number.isFinite(initialBagCount)
        ? initialBagCount
        : 0;

  return {
    ...row,
    availableKg: toFiniteNumber(row.availableKg),
    avgCostPerKg: toFiniteNumber(row.avgCostPerKg),
    meta: row.meta
      ? {
          ...row.meta,
          kgPerBag: Number.isFinite(kgPerBag) ? kgPerBag : undefined,
          bagCount: liveBagCount,
          initialBagCount: Number.isFinite(initialBagCount) ? initialBagCount : liveBagCount,
          remainingBagCount: liveBagCount,
        }
      : row.meta,
  };
}

export async function getSalesOrders(params: { limit?: number } = {}): Promise<SalesOrderDto[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/sales-orders`);
  if (params.limit !== undefined) url.searchParams.append('limit', String(params.limit));

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (res.status === 404) return [];

  const payload = await parseJson<SalesOrderDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load sales orders');
  return unwrapList(payload).map((row) => normalizeSalesOrder(row as SalesOrderDto));
}

export async function getLots(params: GetLotsParams = {}): Promise<LotDto[]> {
  const query = new URLSearchParams();

  if (params.available !== undefined) query.set('available', String(params.available));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.productCategory?.trim()) query.set('productCategory', params.productCategory.trim());
  if (params.productName?.trim()) query.set('productName', params.productName.trim());
  if (params.customerId?.trim()) query.set('customerId', params.customerId.trim());

  const url = query.toString()
    ? `${API_BASE_URL}/api/v1/lots?${query.toString()}`
    : `${API_BASE_URL}/api/v1/lots`;

  const res = await apiFetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  }, params.timeoutMs); 

  if (res.status === 404) return [];

  const payload = await parseJson<LotDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load lots');
  return unwrapList(payload).map((row) => normalizeLot(row as LotDto));
}

export async function getSalesOrderById(id: string): Promise<SalesOrderDto | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/sales-orders/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (res.status === 404) return null;

  const payload = await parseJson<SalesOrderDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load sales order');
  const one = unwrapOne(payload);
  return one ? normalizeSalesOrder(one as SalesOrderDto) : null;
}

export async function createSalesOrderDraft(
  input: CreateSalesOrderInput
): Promise<SalesOrderDraftCreatedDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/sales-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<SalesOrderDraftCreatedDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to save sales draft');
  if (!payload?.data || Array.isArray(payload.data)) {
    throw new Error('Backend did not return sales order data');
  }
  return normalizeSalesOrder(payload.data as SalesOrderDraftCreatedDto);
}

export async function updateSalesOrderDraft(
  id: string,
  input: CreateSalesOrderInput
): Promise<SalesOrderUpdatedDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/sales-orders/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<SalesOrderUpdatedDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update sales draft');
  if (!payload?.data || Array.isArray(payload.data)) {
    throw new Error('Backend did not return sales order data');
  }
  return normalizeSalesOrder(payload.data as SalesOrderUpdatedDto);
}

export async function confirmSalesOrder(id: string): Promise<{ id?: string; status?: string }> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/sales-orders/${id}/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<{ id?: string; status?: string }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to confirm sales order');
  return normalizeSalesOrder((unwrapOne(payload) || {}) as { id?: string; status?: string });
}

export async function deleteSalesOrder(
  id: string,
  editPassword?: string
): Promise<{ id?: string; status?: string }> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/sales-orders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify(editPassword ? { editPassword } : {}),
  });

  const payload = await parseJson<{ id?: string; status?: string }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete sales order');
  return normalizeSalesOrder((unwrapOne(payload) || {}) as { id?: string; status?: string });
}
