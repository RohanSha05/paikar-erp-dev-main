import { Prisma } from '@prisma/client';
import { createAccount } from './module.service';

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
  const code = params.code || `AC-${kind.toUpperCase()}-${refId}`.slice(0, 64);

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
