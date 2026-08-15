'use client';

import { getAuthHeaders } from '@/lib/auth';
import { apiFetch } from '@/lib/api/fetchWithTimeout';
import { dhakaDate } from '../dhaka';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.paikarpos.com';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

export interface AccountDto {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  opening?: number;
}

export interface PartyDto {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  accountId?: string;
}

export interface CreatePartyInput {
  name: string;
  type: 'seller' | 'customer' | 'mill' | 'driver' | 'investor' | 'employee' | 'other';
}

export interface VoucherRowDto {
  id: string;
  accountId: string;
  account?: AccountDto;
  dr: number;
  cr: number;
  memo?: string;
}

export interface VoucherDto {
  id: string;
  voucherNo: string;
  vtype: string;
  vdate: string;
  narration?: string;
  status?: 'DRAFT' | 'POSTED' | 'RECONCILED';
  postedAt?: string | null;
  deletedAt?: string | null;
  reversalId?: string | null;
  rows: VoucherRowDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVoucherInput {
  vtype: string;
  vdate: string;
  rows: Array<{
    accountId: string;
    dr?: number;
    cr?: number;
    memo?: string;
  }>;
  narration?: string;
}

  // export async function postDriverAdvance(input: {
  //   driverId: string;
  //   driverName: string;
  //   amount: number;
  //   instrumentId: string;
  //   memo?: string;
  // }): Promise<{ party: PartyDto; account: AccountDto; voucher: VoucherDto }> {
  //   // const partyName = `Driver ${input.driverId}`;
  //   // const party = await createParty({
  //   //   name: partyName,
  //   //   type: 'driver',
  //   // });

  //   const account = await resolvePartyAccount(input.driverId);
  //   const narration = input.memo || `Driver advance - ${input.driverName}`;

  //   const voucher = await createVoucher({
  //     vtype: 'payment',
  //     vdate: new Date().toISOString().slice(0, 10),
  //     narration,
  //     rows: [
  //       {
  //         accountId: account.id,
  //         dr: input.amount,
  //         cr: 0,
  //         memo: narration,
  //       },
  //       {
  //         accountId: input.instrumentId,
  //         dr: 0,
  //         cr: input.amount,
  //         memo: narration,
  //       },
  //     ],
  //   });

  //   return { account, voucher };
  // }

  export async function postDriverAdvance(input: {
  driverId: string;
  driverName: string;
  amount: number;
  instrumentId: string;
  memo?: string;
}) {
  const account = await resolvePartyAccount(input.driverId);

  const narration = input.memo || `Driver advance - ${input.driverName}`;

  const voucher = await createVoucher({
    vtype: 'payment',
    vdate: dhakaDate(new Date()),
    narration,
    rows: [
      {
        accountId: account.id,
        dr: input.amount,
        cr: 0,
        memo: narration,
      },
      {
        accountId: input.instrumentId,
        dr: 0,
        cr: input.amount,
        memo: narration,
      },
    ],
  });

  return { account, voucher };
}

/**
 * Get all active accounts, optionally filtered by type
 */
export async function getAccounts(filterByType?: string): Promise<AccountDto[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/cashbook/accounts`);
  if (filterByType) {
    url.searchParams.append('type', filterByType);
  }

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<AccountDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to fetch accounts');
  return payload.data || [];
}

/**
 * Get all active parties from Party table, optionally filtered by party type.
 */
export async function getParties(kind?: string): Promise<PartyDto[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/cashbook/parties`);
  if (kind) {
    url.searchParams.append('kind', kind);
  }

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<PartyDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to fetch parties');
  return payload.data || [];
}

/**
 * Create a new party and save into Party table.
 */
export async function createParty(input: CreatePartyInput): Promise<PartyDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/parties`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<PartyDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create party');
  return payload.data!;
}

/**
 * Resolve (or create) party ledger account by party ID.
 */
export async function resolvePartyAccount(partyId: string): Promise<AccountDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/parties/${partyId}/account`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<AccountDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to resolve party account');
  return payload.data!;
}

/**
 * Create a new voucher (payment, receipt, journal, contra)
 */
export async function createVoucher(input: CreateVoucherInput): Promise<VoucherDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/vouchers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<VoucherDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to create voucher');
  return payload.data!;
}

export async function listDraftVouchers(
  startDate?: string,
  endDate?: string,
): Promise<VoucherDto[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/cashbook/vouchers/drafts`);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<VoucherDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to fetch draft vouchers');
  return payload.data || [];
}

export async function createDraftVoucher(input: CreateVoucherInput): Promise<VoucherDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/vouchers/drafts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<VoucherDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to save draft voucher');
  return payload.data!;
}

export async function updateDraftVoucher(
  id: string,
  input: CreateVoucherInput,
): Promise<VoucherDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/vouchers/drafts/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await parseJson<VoucherDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to update draft voucher');
  return payload.data!;
}

export async function deleteDraftVoucher(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/vouchers/drafts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<null>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to delete draft voucher');
}

export async function approveDraftVoucher(id: string): Promise<VoucherDto> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/cashbook/vouchers/drafts/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<VoucherDto>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to approve draft voucher');
  return payload.data!;
}

/**
 * Get all vouchers, optionally filtered by date range
 */
export async function getVouchers(
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<VoucherDto[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/cashbook/vouchers`);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);
  if (limit !== undefined) url.searchParams.append('limit', String(limit));

  const res = await apiFetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<VoucherDto[]>(res);
  if (!res.ok) throw new Error(payload?.message || 'Failed to fetch vouchers');
  return payload.data || [];
}

