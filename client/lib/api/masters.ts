'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';
import { getDrivers as getDriverRows } from '@/lib/api/drivers';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | { items?: T; rows?: T };
};

type CustomerApiDto = {
  id?: string;
  customerId?: string;
  name?: string;
  displayName?: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  type?: string;
    nidNumber?: string;
emergencyPhone?: string;
  kind?: string;
};

export type SellerDto = {
  id: string;
  name: string;
  district?: string;
  market?: string;
  phone?: string;
  nidNumber?: string;
  emergencyPhone?: string;
  address?: string;
};

export type CustomerDto = {
  id: string;
  name: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  nidNumber?: string;
emergencyPhone?: string;
  type?: 'mill' | 'retailer' | 'other';
};

export type WarehouseDto = {
  id: string;
  name: string;
  address?: string;
};

export type DriverDto = {
  id: string;
  name: string;
  phone?: string;
  truckNo?: string;
  active?: boolean;
};

type PartyDto = {
  id?: string;
  partyId?: string;
  name?: string;
  displayName?: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  kind?: string;
  type?: string;
    nidNumber?: string;
emergencyPhone?: string;
  partyType?: string;
  category?: string;
  truckNo?: string;
  active?: boolean;
  isActive?: boolean;
  status?: string;
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

async function getList<T>(path: string, fallbackError: string): Promise<T[]> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  const payload = await parseJson<T[]>(res);
  if (!res.ok) throw new Error(payload?.message || fallbackError);
  return unwrapList(payload);
}

function mapCustomer(c: CustomerApiDto): CustomerDto {
  const id = pickPreferredId([text(c.customerId), text(c.id)]);
  return {
    id,
    name: text(c.name) || text(c.displayName) || id,
    address: text(c.address) || undefined,
    district: text(c.district) || undefined,
    market: text(c.market) || undefined,
    phone: text(c.phone) || undefined,
    nidNumber: text((c as any).nidNumber) || undefined,
    emergencyPhone: text((c as any).emergencyPhone) || undefined,
    type: (lower(c.type || c.kind) as CustomerDto['type']) || 'other',
  };
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function lower(v: unknown): string {
  return text(v).toLowerCase();
}

export function sanitizeSellerBuyerName(value: string): string {
  const noControlChars = value.replace(/[\u0000-\u001F\u007F]/g, '');
  return noControlChars.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function validateSellerBuyerName(value: string): string {
  const sanitized = sanitizeSellerBuyerName(value);
  if (sanitized.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }
  return sanitized;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickPreferredId(candidates: string[]): string {
  const clean = candidates.map((x) => text(x)).filter(Boolean);
  const uuid = clean.find((x) => UUID_RE.test(x));
  return uuid || clean[0] || '';
}

function mapParty(p: PartyDto): SellerDto & CustomerDto & DriverDto {
  const id = text(p.id) || text(p.partyId);
  return {
    id,
    name: text(p.name) || text(p.displayName) || id,
    address: text(p.address) || undefined,
    district: text(p.district) || undefined,
    market: text(p.market) || undefined,
    phone: text(p.phone) || undefined,
    truckNo: text(p.truckNo) || undefined,
        nidNumber: text(p.nidNumber) || undefined,
    emergencyPhone: text(p.emergencyPhone) || undefined,
    active:
      typeof p.active === 'boolean'
        ? p.active
        : typeof p.isActive === 'boolean'
          ? p.isActive
          : lower(p.status) !== 'inactive',
  };
}

function partyKind(p: PartyDto): string {
  return [p.kind, p.type, p.partyType, p.category]
    .map(lower)
    .find(Boolean) || '';
}

function isSellerParty(p: PartyDto): boolean {
  const k = partyKind(p);
  return k.includes('seller') || k.includes('supplier') || k.includes('vendor');
}

function isDriverParty(p: PartyDto): boolean {
  const k = partyKind(p);
  return (
    k.includes('driver') ||
    k.includes('transport') ||
    k.includes('truck') ||
    !!text(p.truckNo)
  );
}

function isMillParty(p: PartyDto): boolean {
  const k = partyKind(p);
  return (
    k.includes('mill') ||
    k.includes('factory') ||
    k.includes('customer') ||
    k.includes('buyer')
  );
}

async function getParties(): Promise<PartyDto[]> {
  return getList<PartyDto>('/api/v1/parties?limit=500', 'Failed to load parties');
}

export function getSellers() {
  return getParties().then((parties) => {
    const sellers = parties.filter(isSellerParty).map(mapParty).filter((x) => !!x.id);
    if (sellers.length) return sellers;

    // Fallback: if party classification is absent in backend, return non-driver parties.
    return parties
      .filter((p) => !isDriverParty(p))
      .map(mapParty)
      .filter((x) => !!x.id);
  });
}

export async function createSeller(input: {
  name: string;
  district?: string;
  market?: string;
  phone?: string;
  paona?: number;
  dena?: number;
  nidNumber?: string;
  emergencyPhone?: string;
  address?: string;

}): Promise<SellerDto> {
  const payloadInput = {
    ...input,
    name: validateSellerBuyerName(input.name),
  };

  const res = await apiFetch(`${API_BASE_URL}/api/v1/parties`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payloadInput),
  });

  const payload = await parseJson<PartyDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create seller');

  const one = unwrapOne(payload);
  if (!one) throw new Error('Backend did not return seller');
  return mapParty(one as PartyDto);
}

export async function updateSeller(
  id: string,
  input: {
    name?: string;
    district?: string;
    market?: string;
    phone?: string;
    nidNumber?: string;
    emergencyPhone?: string;
    address?: string;
  }
): Promise<SellerDto> {
  const payloadInput = {
    ...input,
    ...(typeof input.name === 'string' ? { name: validateSellerBuyerName(input.name) } : {}),
  };

  const res = await apiFetch(`${API_BASE_URL}/api/v1/parties/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payloadInput),
  });

  const payload = await parseJson<PartyDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update seller');

  const one = unwrapOne(payload);
  if (!one) throw new Error('Backend did not return seller');
  return mapParty(one as PartyDto);
}

export async function deleteSeller(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/parties/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<{ id: string }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete seller');
}

// export function getMillCustomers() {
//   return getParties().then((parties) => {
//     const mills = parties
//       .filter(isMillParty)
//       .map((p) => ({ ...mapParty(p), type: 'mill' as const }))
//       .filter((x) => !!x.id);

//     if (mills.length) return mills;

//     return parties
//       .filter((p) => !isDriverParty(p))
//       .map((p) => ({ ...mapParty(p), type: 'mill' as const }))
//       .filter((x) => !!x.id); 
//   });
// }

export function getMillCustomers() {
  return getCustomers();
}

export function getCustomers() {
  return getList<CustomerApiDto>('/api/v1/customers', 'Failed to load customers').then((rows) =>
    rows.map(mapCustomer).filter((x) => !!x.id)
  );
}

export async function createCustomer(input: {
  name: string;
  district?: string;
  market?: string;
  phone?: string;
  paona?: number;
  dena?: number;
  nidNumber?: string;
  emergencyPhone?: string;
  address?: string;
  type?: 'mill' | 'retailer' | 'other';
}): Promise<CustomerDto> {
  const payloadInput = {
    ...input,
    name: validateSellerBuyerName(input.name),
  };

  const res = await apiFetch(`${API_BASE_URL}/api/v1/customers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payloadInput),
  });

  const payload = await parseJson<CustomerApiDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create customer');

  const one = unwrapOne(payload);
  if (!one) throw new Error('Backend did not return customer');
  return mapCustomer(one);
}

export async function updateCustomer(
  id: string,
  input: {
    name?: string;
    district?: string;
    market?: string;
    phone?: string;
    nidNumber?: string;
    emergencyPhone?: string;
    address?: string;
    type?: 'mill' | 'retailer' | 'other';
  }
): Promise<CustomerDto> {
  const payloadInput = {
    ...input,
    ...(typeof input.name === 'string' ? { name: validateSellerBuyerName(input.name) } : {}),
  };

  const res = await apiFetch(`${API_BASE_URL}/api/v1/customers/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payloadInput),
  });

  const payload = await parseJson<CustomerApiDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update customer');

  const one = unwrapOne(payload);
  if (!one) throw new Error('Backend did not return customer');
  return mapCustomer(one);
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/customers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<{ id: string }>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete customer');
}

export function getWarehouses() {
  return getList<WarehouseDto>('/api/v1/warehouses?limit=200', 'Failed to load warehouses');
}

export function getDrivers() {
  return getDriverRows();
}
