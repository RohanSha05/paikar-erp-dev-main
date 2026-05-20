import { Prisma } from '@prisma/client';
import { createAccount } from './module.service';
import { prisma } from '../../db/prisma';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';

export type PartyAccountKind = 'seller' | 'customer' | 'driver' | 'investor' | 'employee' | 'party';

export type EnsurePartyAccountInput = {
	kind: PartyAccountKind | string;
	refId: string;
	name: string;
	code?: string;
	bankInfo?: string;
	type?: string;
  openingDr?: number;
  openingCr?: number;
};

function normalizeToken(value: string) {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function kindAbbr(kind: string): string {
	return kind
		.trim()
		.toUpperCase()
		.slice(0, 3)
		.replace(/[^A-Z0-9]+/g, '');
}

async function generatePartyAccountCode(kind: string): Promise<string> {
	const prefix = `AC-${kindAbbr(kind)}`;
	return nextDailySequenceIdForDelegate(prisma.account, 'code', prefix);
}

export function partyAccountCode(kind: string, refId: string) {
	const safeKind = normalizeToken(kind || 'party') || 'PARTY';
	const safeRef = normalizeToken(refId || 'unknown') || 'UNKNOWN';
	return `PTY-${safeKind}-${safeRef}`.slice(0, 64);
}

export async function ensurePartyAccount(params: {
  kind: string;
  refId: string;
  name: string;
  type: string;
  code?: string;
  openingDr?: number;
  openingCr?: number;
}) {
  const kind = params.kind.trim().toLowerCase();
  const refId = params.refId.trim();
  const code = params.code || (await generatePartyAccountCode(kind));

  const openingDr = Number(params.openingDr ?? 0);
  const openingCr = Number(params.openingCr ?? 0);

  return createAccount({
    code,
    name: params.name.trim(),
    type: params.type,
    openingDr: openingDr > 0 ? openingDr : 0,
    openingCr: openingCr > 0 ? openingCr : 0,
    active: true,
    partyKind: kind,
    partyRefId: refId,
  });
}
