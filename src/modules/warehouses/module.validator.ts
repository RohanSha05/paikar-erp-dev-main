import { z } from 'zod';

export const createWarehouseSchema = z.object({
	body: z.object({
		code: z.string().min(2).max(30),
		name: z.string().min(2).max(120),
		address: z.string().max(255).optional()
	})
});

export const updateWarehouseSchema = z.object({
	params: z.object({
		id: z.string().uuid()
	}),
	body: z
		.object({
			name: z.string().min(2).max(120).optional(),
			address: z.string().max(255).optional()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});
