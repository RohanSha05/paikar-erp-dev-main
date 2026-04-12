import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import type {
  AccountDto,
  PartyDto,
  VoucherDto,
  CreateVoucherInput,
  VoucherRowInput,
} from './module.types';

/**
 * List all active parties from Party table, optionally filtered by type.
 * Also returns linked party account if it exists.
 */
export async function listParties(
  kind?: string,
): Promise<PartyDto[]> {
  const type = kind ? kind.trim().toUpperCase() : undefined;

  const parties = await prisma.party.findMany({
    where: {
      active: true,
      ...(type ? { type: type as any } : {}),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const partyIds = parties.map((party) => party.id);
  const linkedAccounts = partyIds.length
    ? await prisma.account.findMany({
        where: {
          type: 'party',
          partyRefId: { in: partyIds },
        },
        select: { id: true, partyRefId: true },
      })
    : [];

  const accountByPartyId = new Map<string, string>();
  for (const account of linkedAccounts) {
    if (account.partyRefId) {
      accountByPartyId.set(account.partyRefId, account.id);
    }
  }

  return parties.map((party) => ({
    id: party.id,
    code: party.code,
    name: party.name,
    type: party.type.toLowerCase(),
    active: party.active,
    accountId: accountByPartyId.get(party.id),
  }));
}

function partyAccountCode(type: string, partyCode: string) {
  const normType = type.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const normCode = partyCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  return `PTY-${normType}-${normCode}`.slice(0, 64);
}

/**
 * Resolve party account by Party.id, creating one if it does not exist.
 * This keeps settlement tied to Party table while still posting into ledger accounts.
 */
export async function resolvePartyAccount(partyId: string): Promise<AccountDto> {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || !party.active) {
    throw new HttpError(404, 'Party not found');
  }

  const existing = await prisma.account.findFirst({
    where: {
      type: 'party',
      partyRefId: party.id,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      type: existing.type,
      active: existing.active,
      opening: existing.opening ? Number(existing.opening) : 0,
    };
  }

  const created = await prisma.account.create({
    data: {
      code: partyAccountCode(party.type, party.code),
      name: party.name,
      type: 'party',
      partyKind: party.type.toLowerCase(),
      partyRefId: party.id,
      opening: 0,
      active: true,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    type: created.type,
    active: created.active,
    opening: created.opening ? Number(created.opening) : 0,
  };
}

/**
 * List all active accounts, optionally filtered by type
 */
export async function listAccounts(
  filterByType?: string,
): Promise<AccountDto[]> {
  const accounts = await prisma.account.findMany({
    where: {
      active: true,
      ...(filterByType && { type: filterByType }),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return accounts.map((acc) => ({
    id: acc.id,
    code: acc.code,
    name: acc.name,
    type: acc.type,
    active: acc.active,
    opening: acc.opening ? Number(acc.opening) : 0,
  }));
}

/**
 * Generate unique voucher number (YYYY-MM-DD-001 format)
 */
async function generateVoucherNumber(vdate: string): Promise<string> {
  // Format: YYYYMMDD-001
  const datePart = vdate.replace(/-/g, '');

  // Find highest sequence for this date
  const latestVoucher = await prisma.voucher.findFirst({
    where: {
      voucherNo: {
        startsWith: datePart,
      },
    },
    orderBy: {
      voucherNo: 'desc',
    },
  });

  let sequence = 1;
  if (latestVoucher) {
    const match = latestVoucher.voucherNo.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `${datePart}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Validate that all accounts exist
 */
async function validateAccounts(rows: VoucherRowInput[]): Promise<void> {
  const accountIds = rows.map((r) => r.accountId);
  const uniqueIds = [...new Set(accountIds)];

  const foundAccounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });

  const foundIds = new Set(foundAccounts.map((a) => a.id));

  for (const id of uniqueIds) {
    if (!foundIds.has(id)) {
      throw new HttpError(404, `Account not found: ${id}`);
    }
  }
}

/**
 * Create a new voucher with transaction rows
 */
export async function createVoucher(
  input: CreateVoucherInput,
): Promise<VoucherDto> {
  // Validate all accounts exist
  await validateAccounts(input.rows);

  // Generate voucher number
  const voucherNo = await generateVoucherNumber(input.vdate);

  // Parse date to ensure it's valid
  const vdate = new Date(input.vdate + 'T00:00:00Z');
  if (isNaN(vdate.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }

  // Create voucher with rows in a transaction
  const voucher = await prisma.voucher.create({
    data: {
      voucherNo,
      vtype: input.vtype,
      vdate,
      narration: input.narration || `${input.vtype} voucher`,
      rows: {
        create: input.rows.map((row) => ({
          accountId: row.accountId,
          dr: row.dr || 0,
          cr: row.cr || 0,
          memo: row.memo,
        })),
      },
    },
    include: {
      rows: {
        include: {
          account: true,
        },
      },
    },
  });

  return mapVoucherToDto(voucher);
}

/**
 * Get a single voucher by ID with all details
 */
export async function getVoucherById(id: string): Promise<VoucherDto> {
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: {
      rows: {
        include: {
          account: true,
        },
      },
    },
  });

  if (!voucher) {
    throw new HttpError(404, 'Voucher not found');
  }

  return mapVoucherToDto(voucher);
}

/**
 * List vouchers with optional date range filter
 */
export async function listVouchers(
  startDate?: string,
  endDate?: string,
): Promise<VoucherDto[]> {
  const where: any = {};

  if (startDate) {
    where.vdate = {
      ...where.vdate,
      gte: new Date(startDate + 'T00:00:00Z'),
    };
  }

  if (endDate) {
    where.vdate = {
      ...where.vdate,
      lte: new Date(endDate + 'T23:59:59Z'),
    };
  }

  const vouchers = await prisma.voucher.findMany({
    where,
    include: {
      rows: {
        include: {
          account: true,
        },
      },
    },
    orderBy: {
      vdate: 'desc',
    },
  });

  return vouchers.map(mapVoucherToDto);
}

/**
 * Helper to map Prisma voucher to DTO
 */
function mapVoucherToDto(voucher: any): VoucherDto {
  return {
    id: voucher.id,
    voucherNo: voucher.voucherNo,
    vtype: voucher.vtype,
    vdate: voucher.vdate.toISOString().split('T')[0],
    narration: voucher.narration,
    rows: voucher.rows.map((row: any) => ({
      id: row.id,
      accountId: row.accountId,
      account: row.account
        ? {
            id: row.account.id,
            code: row.account.code,
            name: row.account.name,
            type: row.account.type,
            active: row.account.active,
            opening: row.account.opening
              ? Number(row.account.opening)
              : 0,
          }
        : undefined,
      dr: Number(row.dr),
      cr: Number(row.cr),
      memo: row.memo,
    })),
    createdAt: voucher.createdAt.toISOString(),
  };
}
