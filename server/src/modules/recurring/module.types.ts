export interface RecurringTemplateDto {
	id: string;
	name: string;
	expenseAccountId: string;
	payFromAccountId?: string;
	amount: number;
	frequency: 'monthly' | 'daily';
	dayOfMonth?: number;
	active: boolean;
	notes?: string;
	lastPostedDate?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateRecurringTemplateInput {
	name: string;
	expenseAccountId: string;
	payFromAccountId?: string;
	amount: number;
	frequency: 'monthly' | 'daily';
	dayOfMonth?: number;
	active?: boolean;
	notes?: string;
}

export interface UpdateRecurringTemplateInput extends Partial<CreateRecurringTemplateInput> {}
