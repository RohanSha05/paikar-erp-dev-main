import { z } from 'zod';

const roleSchema = z.enum(['ADMIN', 'OPERATOR', 'VIEWER']);

export const createUserSchema = z.object({
	body: z.object({
		name: z.string().min(2).max(120),
		email: z.string().email(),
		password: z.string().min(6).max(72),
		role: roleSchema.default('OPERATOR'),
		active: z.boolean().default(true)
	})
});

export const updateUserSchema = z.object({
	params: z.object({
		id: z.string().uuid()
	}),
	body: z
		.object({
			name: z.string().min(2).max(120).optional(),
			password: z.string().min(6).max(72).optional(),
			role: roleSchema.optional(),
			active: z.boolean().optional()
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field is required'
		})
});
