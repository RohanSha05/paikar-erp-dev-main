import { z } from 'zod';

export const adjustStockSchema = z.object({
	body: z.object({
		lotId: z.string().uuid(),
		mode: z.enum(['add', 'remove']),
		qtyKg: z.number().positive(),
		reason: z.string().max(255).optional()
	})
});

export const transferStockSchema = z.object({
	body: z.object({
		lotId: z.string().uuid(),
		toWarehouseId: z.string().uuid(),
		qtyKg: z.number().positive(),
		memo: z.string().max(255).optional()
	})
});
