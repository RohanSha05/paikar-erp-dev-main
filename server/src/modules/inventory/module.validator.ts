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

export const inventoryDashboardSchema = z.object({
	query: z.object({
		q: z.string().trim().max(100).optional(),
		warehouseId: z.string().uuid().optional(),
		productId: z.string().uuid().optional(),
		availableOnly: z.coerce.boolean().optional().default(false),
		page: z.coerce.number().int().min(1).optional().default(1),
		pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
		sortBy: z.enum(['createdAt', 'availableKg', 'avgCostPerKg']).optional().default('createdAt'),
		sortDir: z.enum(['asc', 'desc']).optional().default('desc')
	})
});

const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const stockCardQuerySchema = z.object({
	query: z.object({
		lotId: z.string().uuid().optional(),
		warehouseId: z.string().uuid().optional(),
		from: z.string().regex(isoDateOnly, 'from must be YYYY-MM-DD').optional(),
		to: z.string().regex(isoDateOnly, 'to must be YYYY-MM-DD').optional(),
		page: z.coerce.number().int().min(1).optional().default(1),
		pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
		sortDir: z.enum(['asc', 'desc']).optional().default('asc')
	})
});
