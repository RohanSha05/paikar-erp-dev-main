/**
 * Cashbook Module Types
 */

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
  opening?: number;
}

export interface CreatePartyInput {
  name: string;
  type: string;
}

export interface VoucherRowInput {
  accountId: string;
  dr?: number;
  cr?: number;
  memo?: string;
}

export type VoucherStatus = 'DRAFT' | 'POSTED' | 'RECONCILED';

export interface CreateVoucherInput {
  vtype: string; // 'payment', 'receipt', 'journal', 'contra'
  vdate: string; // ISO date string (YYYY-MM-DD)
  rows: VoucherRowInput[];
  narration?: string;
}

export interface CreateDraftVoucherInput extends CreateVoucherInput {
  status?: 'DRAFT';
}

export interface UpdateDraftVoucherInput extends CreateVoucherInput {}

export interface VoucherDto {
  id: string;
  voucherNo: string;
  vtype: string;
  vdate: string;
  narration?: string;
  status?: VoucherStatus;
  postedAt?: string | null;
  deletedAt?: string | null;
  reversalId?: string | null;
  auditLog?: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
  rows: Array<{
    id: string;
    accountId: string;
    account?: AccountDto;
    dr: number;
    cr: number;
    memo?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResponse {
  success: boolean;
  data: AccountDto[];
}

export interface CreateVoucherResponse {
  success: boolean;
  data: VoucherDto;
  message: string;
}
