import { z } from 'zod';

export const createOrUpdateBusinessInfoSchema = z.object({
	body: z.object({
		id: z.string().min(1).optional(),
		businessName: z.string().max(255).nullish(),
		proprietorName: z.string().max(255).nullish(),
		additionalProprietor: z.string().max(255).nullish(),
		address: z.string().max(500).nullish(),
		phone1: z.string().max(40).nullish(),
		phone2: z.string().max(40).nullish()
	})
});

export const updateBusinessInfoSchema = z.object({
	params: z.object({
		id: z.string().min(1)
	}),
	body: z
		.object({
			businessName: z.string().max(255).nullish(),
			proprietorName: z.string().max(255).nullish(),
			additionalProprietor: z.string().max(255).nullish(),
			address: z.string().max(500).nullish(),
			phone1: z.string().max(40).nullish(),
			phone2: z.string().max(40).nullish()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});
