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

export async function ensurePartyAccount(input: EnsurePartyAccountInput) {
	const code = (input.code || partyAccountCode(input.kind, input.refId)).trim();
	const kind = input.kind.trim().toLowerCase();
	const refId = input.refId.trim();
	const name = input.name.trim();

	const existing = await prisma.account.findFirst({
		where: {
			OR: [
				{ code },
				{ partyKind: kind, partyRefId: refId },
			],
		},
	});

	if (existing) {
		return existing;
	}

	return prisma.account.create({
		data: {
			code,
			name,
			type: input.type?.trim() || 'party',
			partyKind: kind,
			partyRefId: refId,
			bankInfo: input.bankInfo?.trim() || undefined,
			opening: new Prisma.Decimal(0),
			active: true,
		},
	});
}