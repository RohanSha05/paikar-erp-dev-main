import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';

export type PartyAccountKind = 'seller' | 'customer' | 'driver' | 'investor' | 'employee' | 'party';

export type EnsurePartyAccountInput = {
	kind: PartyAccountKind | string;
	refId: string;
	name: string;
	code?: string;
	bankInfo?: string;
	type?: string;
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
}) {
  const code = params.code || `AC-${params.kind.toUpperCase()}-${params.refId}`.slice(0, 64);

  return prisma.account.upsert({
    where: { code },
    update: {
      name: params.name,
      partyKind: params.kind,   // ✅ must update these
      partyRefId: params.refId, // ✅ on every upsert
    },
    create: {
      code,
      name: params.name,
      type: params.type,
      partyKind: params.kind,   // ✅ must be set on create
      partyRefId: params.refId, // ✅ must be set on create
      active: true,
    },
  });
}
