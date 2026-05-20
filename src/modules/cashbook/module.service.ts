import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { PartyType } from '@prisma/client';
import { ensurePartyAccount } from '../accounting/party-account';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { toTitleCase } from '../../common/utils/voucher-narration';
import { dhakaDayEnd, dhakaDayStart, tzDate, tzDateTime } from '../../common/utils/date';
import type {
  AccountDto,
  CreatePartyInput,
  CreateDraftVoucherInput,
  PartyDto,
  VoucherDto,
  CreateVoucherInput,
  VoucherRowInput,
  UpdateDraftVoucherInput,
} from './module.types';

function slugify(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function normalizePartyType(input: string): PartyType {
  const value = input.trim().toUpperCase();
  if (value === 'SELLER') return 'SELLER';
  if (value === 'CUSTOMER') return 'CUSTOMER';
  if (value === 'MILL') return 'MILL';
  if (value === 'DRIVER') return 'DRIVER';
  if (value === 'INVESTOR') return 'INVESTOR';
  if (value === 'EMPLOYEE') return 'EMPLOYEE';
  return 'OTHER';
}

async function generatePartyCode(type: string) {
  const typeTag = slugify(type).slice(0, 4) || 'PRTY';
  return nextDailySequenceIdForDelegate(prisma.party, 'code', `PTY-${typeTag}`);
}

async function generateDriverId() {
  return nextDailySequenceIdForDelegate(prisma.driver, 'id', 'DRV');
}

async function generateInvestorId() {
  return nextDailySequenceIdForDelegate(prisma.investor, 'id', 'INV');
}

function masterPartyCode(kind: string, id: string) {
  const k = kind.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const r = id.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '-');
  return `MST-${k}-${r}`.slice(0, 64);
}

function partyAccountCodeForPartyTable(type: string, partyCode: string) {
  const normType = type.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  const normCode = partyCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  return `PTY-${normType}-${normCode}`.slice(0, 64);
}

/**
 * Create a party in Party table.
 */
export async function createParty(input: CreatePartyInput): Promise<PartyDto> {
  const name = input.name.trim();
  if (!name) {
    throw new HttpError(400, 'Party name is required');
  }

  const type = normalizePartyType(input.type);

  if (type === 'SELLER') {
    const existingSeller = await prisma.seller.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    const seller = existingSeller || await prisma.seller.create({ data: { name } });
    const account = await ensurePartyAccount({
      kind: 'seller',
      refId: seller.id,
      name: seller.name,
      type: 'party',
      code: `PTY-SELLER-${seller.id}`.slice(0, 64),
    });

    return {
      id: seller.id,
      code: masterPartyCode('seller', seller.id),
      name: seller.name,
      type: 'seller',
      active: true,
      accountId: account.id,
    };
  }

  if (type === 'CUSTOMER') {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    const customer = existingCustomer || await prisma.customer.create({ data: { name } });
    const account = await ensurePartyAccount({
      kind: 'customer',
      refId: customer.id,
      name: customer.name,
      type: 'party',
      code: `PTY-CUSTOMER-${customer.id}`.slice(0, 64),
      
    });

    return {
      id: customer.id,
      code: masterPartyCode('customer', customer.id),
      name: customer.name,
      type: 'customer',
      active: true,
      accountId: account.id,
    };
  }

  if (type === 'DRIVER') {
    const existingDriver = await prisma.driver.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    const driver = existingDriver || await prisma.driver.create({
      data: {
        id: await generateDriverId(),
        name,
        active: true,
      },
    });

    const account = await ensurePartyAccount({
      kind: 'driver',
      refId: driver.id,
      name: driver.name,
      type: 'party',
      code: `PTY-DRIVER-${driver.id}`.slice(0, 64),
    });

    return {
      id: driver.id,
      code: masterPartyCode('driver', driver.id),
      name: driver.name,
      type: 'driver',
      active: driver.active,
      accountId: account.id,
    };
  }

  if (type === 'INVESTOR') {
    const existingInvestor = await prisma.investor.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    const investor = existingInvestor || await prisma.investor.create({
      data: {
        id: await generateInvestorId(),
        name,
        active: true,
      },
    });

    const account = await ensurePartyAccount({
      kind: 'investor',
      refId: investor.id,
      name: investor.name,
      type: 'party',
      code: `PTY-INVESTOR-${investor.id}`.slice(0, 64),
    });

    return {
      id: investor.id,
      code: masterPartyCode('investor', investor.id),
      name: investor.name,
      type: 'investor',
      active: investor.active,
      accountId: account.id,
    };
  }

  const existing = await prisma.party.findFirst({
    where: {
      active: true,
      type,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      type: existing.type.toLowerCase(),
      active: existing.active,
    };
  }

  const code = await generatePartyCode(type);

  const created = await prisma.party.create({
    data: {
      code,
      name,
      type,
      active: true,
    },
  });

	await ensurePartyAccount({
		kind: created.type.toLowerCase(),
		refId: created.id,
		name: created.name,
    code: partyAccountCodeForPartyTable(created.type, created.code),
		type: 'party',
	});

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    type: created.type.toLowerCase(),
    active: created.active,
  };
}

/**
 * List all active parties from Party table, optionally filtered by type.
 * Also returns linked party account if it exists.
 */
export async function listParties(
  kind?: string,
): Promise<PartyDto[]> {
  const type = kind ? normalizePartyType(kind) : undefined;
  const includeSellers = !type || type === 'SELLER';
  const includeCustomers = !type || type === 'CUSTOMER';
  const includeDrivers = !type || type === 'DRIVER';
  const includeInvestors = !type || type === 'INVESTOR';
  const includeGenericPartyTable = !type || ['MILL', 'EMPLOYEE', 'OTHER'].includes(type);

  const [sellers, customers, drivers, investors, parties, linkedAccounts] = await Promise.all([
    includeSellers ? prisma.seller.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    includeCustomers ? prisma.customer.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    includeDrivers ? prisma.driver.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    includeInvestors ? prisma.investor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    includeGenericPartyTable
      ? prisma.party.findMany({
          where: {
            active: true,
            ...(type ? { type } : {}),
          },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
        })
      : Promise.resolve([]),
    prisma.account.findMany({
      where: { type: 'party' },
      select: { id: true, partyKind: true, partyRefId: true , opening: true,},
    }),
  ]);

  
  const accountByRef = new Map<string, { id: string; opening: number }>();
  for (const account of linkedAccounts) {
    const k = `${(account.partyKind || '').toLowerCase()}:${account.partyRefId || ''}`;
    if (account.partyKind && account.partyRefId && !accountByRef.has(k)) {
      accountByRef.set(k, {
        id: account.id,
        opening: account.opening ? Number(account.opening) : 0,
      });
    
    
    // for a specific seller:
    sellers.forEach(s => {
      const key = `seller:${s.id}`;
    });
    }
  }

  const rows: PartyDto[] = [];

  for (const seller of sellers) {
  rows.push({
    id: seller.id,
    code: masterPartyCode('seller', seller.id),
    name: seller.name,
    type: 'seller',
    active: true,
    accountId: accountByRef.get(`seller:${seller.id}`)?.id,
    opening: accountByRef.get(`seller:${seller.id}`)?.opening ?? 0,
  });
}

for (const customer of customers) {
  rows.push({
    id: customer.id,
    code: masterPartyCode('customer', customer.id),
    name: customer.name,
    type: 'customer',
    active: true,
    accountId: accountByRef.get(`customer:${customer.id}`)?.id,
    opening: accountByRef.get(`customer:${customer.id}`)?.opening ?? 0,
  });
}

for (const driver of drivers) {
  rows.push({
    id: driver.id,
    code: masterPartyCode('driver', driver.id),
    name: driver.name,
    type: 'driver',
    active: driver.active,
    accountId: accountByRef.get(`driver:${driver.id}`)?.id,
    opening: accountByRef.get(`driver:${driver.id}`)?.opening ?? 0,
  });
}

for (const investor of investors) {
  rows.push({
    id: investor.id,
    code: masterPartyCode('investor', investor.id),
    name: investor.name,
    type: 'investor',
    active: investor.active,
    accountId: accountByRef.get(`investor:${investor.id}`)?.id,
    opening: accountByRef.get(`investor:${investor.id}`)?.opening ?? 0,
  });
}

for (const party of parties) {
  rows.push({
    id: party.id,
    code: party.code,
    name: party.name,
    type: party.type.toLowerCase(),
    active: party.active,
    accountId: accountByRef.get(`${party.type.toLowerCase()}:${party.id}`)?.id,
    opening: accountByRef.get(`${party.type.toLowerCase()}:${party.id}`)?.opening ?? 0,
  });
}

  return rows.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });
}

/**
 * Resolve party account by Party.id, creating one if it does not exist.
 * This keeps settlement tied to Party table while still posting into ledger accounts.
 */
export async function resolvePartyAccount(partyId: string): Promise<AccountDto> {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (party?.active) {
    const account = await ensurePartyAccount({
      kind: party.type.toLowerCase(),
      refId: party.id,
      name: party.name,
      code: partyAccountCodeForPartyTable(party.type, party.code),
      type: 'party',
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      opening: account.opening ? Number(account.opening) : 0,
    };
  }

  const seller = await prisma.seller.findUnique({ where: { id: partyId } });
  if (seller) {
    const account = await ensurePartyAccount({
      kind: 'seller',
      refId: seller.id,
      name: seller.name,
      type: 'party',
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      opening: account.opening ? Number(account.opening) : 0,
    };
  }

  const customer = await prisma.customer.findUnique({ where: { id: partyId } });
  if (customer) {
    const account = await ensurePartyAccount({
      kind: 'customer',
      refId: customer.id,
      name: customer.name,
      type: 'party',
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      opening: account.opening ? Number(account.opening) : 0,
    };
  }

  const driver = await prisma.driver.findUnique({ where: { id: partyId } });
  if (driver?.active) {
    const account = await ensurePartyAccount({
      kind: 'driver',
      refId: driver.id,
      name: driver.name,
      type: 'party',
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      opening: account.opening ? Number(account.opening) : 0,
    };
  }

  const investor = await prisma.investor.findUnique({ where: { id: partyId } });
  if (investor?.active) {
    const account = await ensurePartyAccount({
      kind: 'investor',
      refId: investor.id,
      name: investor.name,
      type: 'party',
    });

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      active: account.active,
      opening: account.opening ? Number(account.opening) : 0,
    };
  }

  throw new HttpError(404, 'Party not found');
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
 * Generate unique voucher number (VCH-YYYYMMDD-001 format)
 */
async function generateVoucherNumber(vdate: string): Promise<string> {
  return nextDailySequenceIdForDelegate(
    prisma.voucher,
    'voucherNo',
    'VCH',
    dhakaDayStart(vdate),
  );
}

/**
 * Resolve voucher row account references from either account.id or account.code.
 */
async function resolveVoucherRowAccounts(rows: VoucherRowInput[]): Promise<VoucherRowInput[]> {
  const requested = rows.map((r) => r.accountId);
  const uniqueRequested = [...new Set(requested)];

  const foundAccounts = await prisma.account.findMany({
    where: {
      OR: [
        { id: { in: uniqueRequested } },
        { code: { in: uniqueRequested } },
      ],
    },
    select: { id: true, code: true },
  });

  const accountIdByAnyKey = new Map<string, string>();
  for (const account of foundAccounts) {
    accountIdByAnyKey.set(account.id, account.id);
    accountIdByAnyKey.set(account.code, account.id);
  }

  return rows.map((row) => {
    const resolvedId = accountIdByAnyKey.get(row.accountId);
    if (!resolvedId) {
      throw new HttpError(404, `Account not found: ${row.accountId}`);
    }
    return {
      ...row,
      accountId: resolvedId,
    };
  });
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseVoucherDate(vdate: string) {
  const parsed = dhakaDayStart(vdate);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }
  return parsed;
}

async function buildVoucherRows(rows: VoucherRowInput[]) {
  const normalizedRows: VoucherRowInput[] = rows.map((row) => ({
    accountId: row.accountId,
    dr: Number(row.dr || 0),
    cr: Number(row.cr || 0),
    memo: row.memo,
  }));

  const totalDr = round2(normalizedRows.reduce((sum, row) => sum + Number(row.dr || 0), 0));
  const totalCr = round2(normalizedRows.reduce((sum, row) => sum + Number(row.cr || 0), 0));
  const diff = round2(totalDr - totalCr);

  if (Math.abs(diff) > 0.01) {
    throw new HttpError(
      400,
      `Debit/Credit must be equal (DR=${totalDr}, CR=${totalCr}, diff=${diff})`,
    );
  }

  if (Math.abs(diff) > 0) {
    const roundingAccountId = await ensureRoundingAccountId();
    normalizedRows.push(
      diff > 0
        ? { accountId: roundingAccountId, dr: 0, cr: Math.abs(diff), memo: 'Auto rounding (CR)' }
        : { accountId: roundingAccountId, dr: Math.abs(diff), cr: 0, memo: 'Auto rounding (DR)' },
    );
  }

  return resolveVoucherRowAccounts(normalizedRows);
}

async function createVoucherRecord(
  input: CreateVoucherInput,
  status: 'DRAFT' | 'POSTED',
): Promise<VoucherDto> {
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    throw new HttpError(400, 'Voucher must contain at least one row');
  }

  const resolvedRows = await buildVoucherRows(input.rows);
  const voucherNo = await generateVoucherNumber(input.vdate);
  const vdate = parseVoucherDate(input.vdate);

  const voucher = await prisma.voucher.create({
    data: {
      voucherNo,
      vtype: input.vtype,
      vdate,
      narration: input.narration?.trim() || toTitleCase(input.vtype),
      status,
      postedAt: status === 'POSTED' ? new Date() : null,
      locked: status === 'POSTED',
      rows: {
        create: resolvedRows.map((row) => ({
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

async function ensureRoundingAccountId(): Promise<string> {
  const account = await prisma.account.upsert({
    where: { code: 'AC-ROUND' },
    update: {},
    create: {
      code: 'AC-ROUND',
      name: 'Rounding Difference',
      type: 'income',
      active: true,
      opening: 0,
    },
    select: { id: true },
  });
  return account.id;
}
 
/**
 * Create a new voucher with transaction rows
 */
export async function createVoucher(
  input: CreateVoucherInput,
): Promise<VoucherDto> {
  return createVoucherRecord(input, 'POSTED');
}

export async function createDraftVoucher(
  input: CreateDraftVoucherInput, 
): Promise<VoucherDto> {
  return createVoucherRecord(input, 'DRAFT');
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
  status?: string,
): Promise<VoucherDto[]> {
  const where: any = {};

  if (startDate) {
    where.vdate = {
      ...where.vdate,
      gte: dhakaDayStart(startDate),
    };
  }

  if (endDate) {
    where.vdate = {
      ...where.vdate,
      lte: dhakaDayEnd(endDate),
    };
  }

  if (status) {
    where.status = status;
  } else {
    // Default voucher list should not include unapproved drafts.
    where.NOT = { status: 'DRAFT' };
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
      vdate: 'asc',
    },
  });

  return vouchers.map(mapVoucherToDto);
}

export async function listDraftVouchers(
  startDate?: string,
  endDate?: string,
): Promise<VoucherDto[]> {
  return listVouchers(startDate, endDate, 'DRAFT');
}

export async function updateDraftVoucher(
  id: string,
  input: UpdateDraftVoucherInput,
): Promise<VoucherDto> {
  const existing = await prisma.voucher.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing || existing.status !== 'DRAFT') {
    throw new HttpError(404, 'Draft voucher not found');
  }

  const resolvedRows = await buildVoucherRows(input.rows);
  const vdate = parseVoucherDate(input.vdate);

  const voucher = await prisma.$transaction(async (tx) => {
    await tx.voucherRow.deleteMany({ where: { voucherId: id } });

    return tx.voucher.update({
      where: { id },
      data: {
        vtype: input.vtype,
        vdate,
        narration: input.narration?.trim() || toTitleCase(input.vtype),
        postedAt: null,
        locked: false,
        rows: {
          create: resolvedRows.map((row) => ({
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
  });

  return mapVoucherToDto(voucher);
}

export async function deleteDraftVoucher(id: string): Promise<void> {
  const existing = await prisma.voucher.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing || existing.status !== 'DRAFT') {
    throw new HttpError(404, 'Draft voucher not found');
  }

  await prisma.voucher.delete({ where: { id } });
}

export async function approveDraftVoucher(id: string): Promise<VoucherDto> {
  const existing = await prisma.voucher.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing || existing.status !== 'DRAFT') {
    throw new HttpError(404, 'Draft voucher not found');
  }

  const voucher = await prisma.voucher.update({
    where: { id },
    data: {
      status: 'POSTED',
      postedAt: new Date(),
      locked: true,
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
 * Helper to map Prisma voucher to DTO
 */
function mapVoucherToDto(voucher: any): VoucherDto {
  return {
    id: voucher.id,
    voucherNo: voucher.voucherNo,
    vtype: voucher.vtype,
    vdate: tzDate(voucher.vdate),
    narration: voucher.narration,
    status: voucher.status,
    postedAt: voucher.postedAt ? tzDateTime(voucher.postedAt) : null,
    deletedAt: voucher.deletedAt ? tzDateTime(voucher.deletedAt) : null,
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
            opening: row.account.opening ? Number(row.account.opening) : 0,
          }
        : undefined,
      dr: Number(row.dr),
      cr: Number(row.cr),
      memo: row.memo,
    })),
    createdAt: tzDateTime(voucher.createdAt),
    updatedAt: voucher.updatedAt ? tzDateTime(voucher.updatedAt) : tzDateTime(voucher.createdAt),
  };
}
