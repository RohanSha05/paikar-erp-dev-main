import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { createVoucher } from '../cashbook/module.service';
import type {
	CreateRecurringTemplateInput,
	RecurringTemplateDto,
	UpdateRecurringTemplateInput,
} from './module.types';

function toNumber(value: Prisma.Decimal | number | null | undefined) {
	return value ? Number(value) : 0;
}

function toDto(template: any): RecurringTemplateDto {
	return {
		id: template.id,
		name: template.name,
		expenseAccountId: template.expenseAccountId,
		payFromAccountId: template.payFromAccountId || undefined,
		amount: toNumber(template.amount),
		frequency: template.frequency,
		dayOfMonth: template.dayOfMonth || undefined,
		active: template.active,
		notes: template.notes || undefined,
		lastPostedDate: template.lastPostedDate ? template.lastPostedDate.toISOString().slice(0, 10) : undefined,
		createdAt: template.createdAt.toISOString(),
		updatedAt: template.updatedAt.toISOString(),
	};
}

export async function listRecurringTemplates() {
	const templates = await prisma.recurringExpenseTemplate.findMany({
		orderBy: [{ createdAt: 'desc' }],
	});
	return templates.map(toDto);
}

export async function createRecurringTemplate(input: CreateRecurringTemplateInput) {
	const template = await prisma.recurringExpenseTemplate.create({
		data: {
			name: input.name.trim(),
			expenseAccountId: input.expenseAccountId,
			payFromAccountId: input.payFromAccountId?.trim() || null,
			amount: new Prisma.Decimal(input.amount),
			frequency: input.frequency,
			dayOfMonth: input.dayOfMonth || null,
			active: input.active !== false,
			notes: input.notes?.trim() || null,
		},
	});
	return toDto(template);
}

export async function updateRecurringTemplate(id: string, input: UpdateRecurringTemplateInput) {
	const existing = await prisma.recurringExpenseTemplate.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Recurring template not found');
	}
	const template = await prisma.recurringExpenseTemplate.update({
		where: { id },
		data: {
			name: input.name?.trim(),
			expenseAccountId: input.expenseAccountId,
			payFromAccountId: input.payFromAccountId === undefined ? undefined : input.payFromAccountId?.trim() || null,
			amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
			frequency: input.frequency,
			dayOfMonth: input.dayOfMonth === undefined ? undefined : input.dayOfMonth || null,
			active: input.active,
			notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
		},
	});
	return toDto(template);
}

export async function deleteRecurringTemplate(id: string) {
	const existing = await prisma.recurringExpenseTemplate.findUnique({ where: { id } });
	if (!existing) {
		throw new HttpError(404, 'Recurring template not found');
	}
	await prisma.recurringExpenseTemplate.delete({ where: { id } });
}

function monthDate(year: number, month: number, dayOfMonth?: number) {
	const day = Math.min(Math.max(dayOfMonth || 1, 1), 31);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.toISOString().slice(0, 10);
}

export async function postRecurringTemplate(id: string, year: number, month: number) {
	const template = await prisma.recurringExpenseTemplate.findUnique({ where: { id } });
	if (!template) {
		throw new HttpError(404, 'Recurring template not found');
	}

	const duplicate = await prisma.recurringExpensePost.findUnique({
		where: { templateId_year_month: { templateId: id, year, month } },
	});
	if (duplicate) {
		throw new HttpError(409, 'Recurring template already posted for this month');
	}

	if (!template.payFromAccountId) {
		throw new HttpError(400, 'Pay from account is required');
	}

	const voucher = await createVoucher({
		vtype: 'journal',
		vdate: monthDate(year, month, template.dayOfMonth || 1),
		narration: `Recurring: ${template.name}`,
		rows: [
			{ accountId: template.expenseAccountId, dr: toNumber(template.amount), cr: 0, memo: template.name },
			{ accountId: template.payFromAccountId, dr: 0, cr: toNumber(template.amount), memo: template.name },
		],
	});

	await prisma.recurringExpensePost.create({
		data: {
			templateId: template.id,
			year,
			month,
			voucherId: voucher.id,
			voucherNo: voucher.voucherNo,
		},
	});

	await prisma.recurringExpenseTemplate.update({
		where: { id: template.id },
		data: { lastPostedDate: new Date() },
	});

	return {
		voucherId: voucher.id,
		voucherNo: voucher.voucherNo,
	};
}
