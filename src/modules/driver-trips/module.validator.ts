import { z } from 'zod';

export const createDriverTripSchema = z.object({
	body: z.object({
		id: z.string().min(1).max(80).optional(),
		driverId: z.string().min(1),
		driverName: z.string().max(120).optional(),
		date: z.string().min(1),
		route: z.string().max(255).optional(),
		truckNo: z.string().max(60).optional(),
		amount: z.number().positive(),
		memo: z.string().max(500).optional(),
		poId: z.string().max(80).optional(),
		settled: z.boolean().optional(),
		settledAt: z.string().optional()
	})
});

export const updateDriverTripSchema = z.object({
	params: z.object({
		id: z.string().min(1)
	}),
	body: z
		.object({
			driverName: z.string().max(120).optional(),
			date: z.string().optional(),
			route: z.string().max(255).optional(),
			truckNo: z.string().max(60).optional(),
			amount: z.number().positive().optional(),
			memo: z.string().max(500).optional(),
			poId: z.string().max(80).optional(),
			settled: z.boolean().optional(),
			settledAt: z.string().nullable().optional()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});