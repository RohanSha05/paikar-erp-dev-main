import { z } from 'zod';

export const yearQuerySchema = z.object({
	query: z.object({
		year: z.coerce.number().int().min(2000).max(2100).optional(),
	}),
});

export const purchaseOrderIdParamSchema = z.object({
	params: z.object({
		id: z.string().min(1, 'Purchase order ID is required'),
	}),
});
