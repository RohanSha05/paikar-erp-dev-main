import { z } from 'zod';

export const createAccountSchema = z.object({
	body: z.object({
		code: z.string().trim().min(1).optional(),
		name: z.string().trim().min(1, { message: 'Account name is required' }),
		type: z.string().trim().min(1, { message: 'Account type is required' }),
		opening: z.coerce.number().optional().default(0),
		openingDr: z.coerce.number().optional().default(0),
		openingCr: z.coerce.number().optional().default(0),
		active: z.coerce.boolean().optional().default(true),
		partyKind: z.string().trim().min(1).optional(),
		partyRefId: z.string().trim().min(1).optional(),
		bankInfo: z.string().trim().optional(),
	}),
});
