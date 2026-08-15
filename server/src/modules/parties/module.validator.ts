import { z } from 'zod';

export const createPartySchema = z.object({
	body: z.object({
		name: z.string().min(2).max(120),
		district: z.string().max(120).optional(),
		market: z.string().max(120).optional(),
		phone: z.string().max(40).optional()
	})
});

export const updatePartySchema = z.object({
	params: z.object({
		id: z.string().uuid()
	}),
	body: z
		.object({
			name: z.string().min(2).max(120).optional(),
			district: z.string().max(120).optional(),
			market: z.string().max(120).optional(),
			phone: z.string().max(40).optional()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});

	export const deletePartySchema = z.object({
		params: z.object({
			id: z.string().uuid()
		})
	});
