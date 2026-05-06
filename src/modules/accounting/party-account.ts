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
  const kind = params.kind.trim().toLowerCase();
  const refId = params.refId.trim();
  const code = params.code || `AC-${kind.toUpperCase()}-${refId}`.slice(0, 64);

  return prisma.account.upsert({
    where: { code },
    update: {
      name: params.name.trim(),
      type: params.type,
      partyKind: kind,
      partyRefId: refId,
      active: true,
    },
    create: {
      code,
      name: params.name.trim(),
      type: params.type,
      partyKind: kind,
      partyRefId: refId,
      active: true,
    },
  });
}
