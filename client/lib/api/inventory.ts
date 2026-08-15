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

export async function adjustStock(input: {
  lotId: string;
  mode: 'add' | 'remove';
  qtyKg: number;
  reason?: string;
}) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/inventory/adjust`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input)
  });

  const payload = await parseJson<{ lot?: unknown; move?: unknown }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to adjust stock');
  return payload.data;
}

export async function transferStock(input: {
  lotId: string;
  toWarehouseId: string;
  qtyKg: number;
  memo?: string;
}) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/inventory/transfer`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input)
  });

  const payload = await parseJson<{ sourceLot?: unknown; destinationLot?: unknown }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to transfer stock');
  return payload.data;
}

export interface InventoryDashboardItem {
  id: string;
  lotNo: string;
  label: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  availableKg: number;
  avgCostPerKg: number;
  kgPerBag?: number;
  bagCount?: number;
  remainingBagCount?: number;
  initialBagCount?: number;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDashboardResponse {
  summary: {
    totalLots: number;
    totalQtyKg: number;
    totalValue: number;
  };
  breakdownByProduct: Array<{
    productId: string;
    productName: string;
    lotCount: number;
    qtyKg: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items: InventoryDashboardItem[];
}

export async function getInventoryDashboard(params: {
  q?: string;
  warehouseId?: string;
  productId?: string;
  availableOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'availableKg' | 'avgCostPerKg';
  sortDir?: 'asc' | 'desc';
} = {}): Promise<InventoryDashboardResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.append('q', params.q);
  if (params.warehouseId) searchParams.append('warehouseId', params.warehouseId);
  if (params.productId) searchParams.append('productId', params.productId);
  if (params.availableOnly) searchParams.append('availableOnly', 'true');
  if (params.page) searchParams.append('page', String(params.page));
  if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortDir) searchParams.append('sortDir', params.sortDir);

  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/inventory/dashboard?${searchParams}`,
    {
      headers: getAuthHeaders(),
      cache: 'no-store'
    }
  );

  const payload = await parseJson<InventoryDashboardResponse>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load inventory dashboard');
  if (!payload.data) throw new Error('No dashboard data returned');
  return payload.data;
}

export interface StockCardItem {
  id: string;
  moveNo: string;
  createdAt: string;
  reason: string;
  refType: string;
  refId: string;
  memo?: string;
  qtyKg: number;
  lotId: string;
  lotLabel: string;
  warehouseId: string;
  warehouseName: string;
}

export interface StockCardResponse {
  filters: {
    lotId: string | null;
    warehouseId: string | null;
    from: string | null;
    to: string | null;
    sortDir: string;
  };
  summary: {
    openingQtyKg: number;
    totalInKg: number;
    totalOutKg: number;
    netMovementKg: number;
    closingQtyKg: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items: StockCardItem[];
}

export async function getStockCard(params: {
  lotId?: string;
  warehouseId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortDir?: 'asc' | 'desc';
} = {}): Promise<StockCardResponse> {
  const searchParams = new URLSearchParams();
  if (params.lotId) searchParams.append('lotId', params.lotId);
  if (params.warehouseId) searchParams.append('warehouseId', params.warehouseId);
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.page) searchParams.append('page', String(params.page));
  if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));
  if (params.sortDir) searchParams.append('sortDir', params.sortDir);

  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/inventory/stock-card?${searchParams}`,
    {
      headers: getAuthHeaders(),
      cache: 'no-store'
    }
  );

  const payload = await parseJson<StockCardResponse>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load stock card');
  if (!payload.data) throw new Error('No stock card data returned');
  return payload.data;
}

export interface InventoryReportRow {
  id: string;
  createdAt: string;
  transactionType: 'purchase' | 'sale';
  partyName?: string;
  poNo?: string;
  soNo?: string;
  sellerId?: string;
  sellerName?: string;
  customerId?: string;
  customerName?: string;
  lotId: string;
  lotLabel?: string;
  productId?: string;
  productName?: string;
  warehouseId?: string;
  warehouseName?: string;
  qtyKg: number;
  bagCount: number;
  mon: number;
  unitCost: number;
  totalPrice: number;
  drKg: number;
  crKg: number;
  drAmount: number;
  crAmount: number;
  reason: string;
  refType?: string;
  refId?: string;
  memo?: string;
}

export interface InventoryReportResponse {
  summary: {
    openingQtyKg: number;
    openingAmount: number;
    totalDrKg: number;
    totalCrKg: number;
    totalDrAmount: number;
    totalCrAmount: number;
    totalInKg: number;
    totalOutKg: number;
    closingQtyKg: number;
    closingAmount: number;
    totalPurchasedBags: number;
    totalSoldBags: number;
    closingBagCount: number;
    closingMon: number;
    purchasedPrice: number;
    soldPrice: number;
    closingPriceByFlow: number;
    totalLots: number;
    purchaseCount: number;
    saleCount: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items: InventoryReportRow[];
}

export async function getInventoryReport(params: {
  from?: string;
  to?: string;
  transactionType?: 'all' | 'purchase' | 'sale';
  partyId?: string;
  warehouseId?: string;
  productId?: string;
  productCategory?: string;
  q?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<InventoryReportResponse> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.transactionType) searchParams.append('transactionType', params.transactionType);
  if (params.partyId) searchParams.append('partyId', params.partyId);
  if (params.warehouseId) searchParams.append('warehouseId', params.warehouseId);
  if (params.productId) searchParams.append('productId', params.productId);
if (params.productCategory) {
  searchParams.append('productCategory', params.productCategory);
}  if (params.q) searchParams.append('q', params.q);
  if (params.page) searchParams.append('page', String(params.page));
  if (params.pageSize) searchParams.append('pageSize', String(params.pageSize));

  const res = await apiFetch(`${API_BASE_URL}/api/v1/inventory/report?${searchParams}`, {
    headers: getAuthHeaders(),
    cache: 'no-store'
  });

  const payload = await parseJson<InventoryReportResponse>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to load inventory report');
  if (!payload.data) throw new Error('No inventory report data returned');
  return payload.data;
}