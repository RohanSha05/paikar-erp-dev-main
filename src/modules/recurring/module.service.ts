import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { dhakaDayStart, tzDate, tzDateTime } from '../../common/utils/date';
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
		lastPostedDate: template.lastPostedDate ? tzDate(template.lastPostedDate) : undefined,
		createdAt: tzDateTime(template.createdAt),
		updatedAt: tzDateTime(template.updatedAt),
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
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

function normalizePostDate(postDate?: string) {
	const value = postDate?.trim();
	return value ? dhakaDayStart(value) : null;
}

async function resolveAccountIdByCodeOrId(tx: Prisma.TransactionClient, value: string) {
	const key = value.trim();
	if (!key) {
		throw new HttpError(400, 'Account reference is required');
	}

	const account = await tx.account.findFirst({
		where: {
			OR: [{ id: key }, { code: key }],
		},
		select: { id: true },
	});

	if (!account) {
		throw new HttpError(404, `Account not found: ${key}`);
	}

	return account.id;
}

export async function postRecurringTemplate(id: string, year: number, month: number, postDate?: string) {
	return prisma.$transaction(async (tx) => {
		const template = await tx.recurringExpenseTemplate.findUnique({ where: { id } });
		if (!template) {
			throw new HttpError(404, 'Recurring template not found');
		}

		const duplicate = await tx.recurringExpensePost.findUnique({
			where: { templateId_year_month: { templateId: id, year, month } },
		});
		if (duplicate) {
			throw new HttpError(409, 'Recurring template already posted for this month');
		}

		if (!template.payFromAccountId) {
			throw new HttpError(400, 'Pay from account is required');
		}

		const expenseAccountId = await resolveAccountIdByCodeOrId(tx, template.expenseAccountId);
		const payFromAccountId = await resolveAccountIdByCodeOrId(tx, template.payFromAccountId);
		const voucherDate = normalizePostDate(postDate) || dhakaDayStart(monthDate(year, month, template.dayOfMonth || 1));

		const voucher = await tx.voucher.create({
			data: {
				voucherNo: await nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', voucherDate),
				vtype: 'payment',
				vdate: voucherDate,
				narration: `Recurring: ${template.name}`,
				status: 'POSTED'
			},
		});

		await tx.voucherRow.createMany({
			data: [
				{
					voucherId: voucher.id,
					accountId: expenseAccountId,
					dr: new Prisma.Decimal(toNumber(template.amount)),
					cr: new Prisma.Decimal(0),
					memo: template.name,
				},
				{
					voucherId: voucher.id,
					accountId: payFromAccountId,
					dr: new Prisma.Decimal(0),
					cr: new Prisma.Decimal(toNumber(template.amount)),
					memo: template.name,
				},
			],
		});

		await tx.recurringExpensePost.create({
			data: {
				templateId: template.id,
				year,
				month,
				voucherId: voucher.id,
				voucherNo: voucher.voucherNo,
			},
		});

		await tx.recurringExpenseTemplate.update({
			where: { id: template.id },
			data: { lastPostedDate: voucherDate },
		});

		return {
			voucherId: voucher.id,
			voucherNo: voucher.voucherNo,
		};
	});
}
