import { z } from 'zod';

export const createDriverSchema = z.object({
	body: z.object({
		id: z.string().min(1).max(80).optional(),
		name: z.string().min(2).max(120),
		phone: z.string().max(40).optional(),
		truckNo: z.string().max(60).optional(),
		licenseNo: z.string().max(80).optional(),
		active: z.boolean().default(true)
	})
});

export const updateDriverSchema = z.object({
	params: z.object({
		id: z.string().min(1)
	}),
	body: z
		.object({
			name: z.string().min(2).max(120).optional(),
			phone: z.string().max(40).optional(),
			truckNo: z.string().max(60).optional(),
			licenseNo: z.string().max(80).optional(),
			active: z.boolean().optional()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});