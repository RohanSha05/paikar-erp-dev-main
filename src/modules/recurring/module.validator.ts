import { z } from 'zod';

export const recurringTemplateSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1, { message: 'Template name is required' }),
		expenseAccountId: z.string().trim().min(1),
		payFromAccountId: z.string().trim().min(1).optional(),
		amount: z.coerce.number().positive({ message: 'Amount must be greater than 0' }),
		frequency: z.enum(['monthly', 'daily']),
		dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
		active: z.coerce.boolean().optional().default(true),
		notes: z.string().optional(),
	}),
});

export const updateRecurringTemplateSchema = z.object({
	body: recurringTemplateSchema.shape.body.partial(),
});
