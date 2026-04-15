"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecurringTemplates = listRecurringTemplates;
exports.createRecurringTemplate = createRecurringTemplate;
exports.updateRecurringTemplate = updateRecurringTemplate;
exports.deleteRecurringTemplate = deleteRecurringTemplate;
exports.postRecurringTemplate = postRecurringTemplate;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const module_service_1 = require("../cashbook/module.service");
function toNumber(value) {
    return value ? Number(value) : 0;
}
function toDto(template) {
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
async function listRecurringTemplates() {
    const templates = await prisma_1.prisma.recurringExpenseTemplate.findMany({
        orderBy: [{ createdAt: 'desc' }],
    });
    return templates.map(toDto);
}
async function createRecurringTemplate(input) {
    const template = await prisma_1.prisma.recurringExpenseTemplate.create({
        data: {
            name: input.name.trim(),
            expenseAccountId: input.expenseAccountId,
            payFromAccountId: input.payFromAccountId?.trim() || null,
            amount: new client_1.Prisma.Decimal(input.amount),
            frequency: input.frequency,
            dayOfMonth: input.dayOfMonth || null,
            active: input.active !== false,
            notes: input.notes?.trim() || null,
        },
    });
    return toDto(template);
}
async function updateRecurringTemplate(id, input) {
    const existing = await prisma_1.prisma.recurringExpenseTemplate.findUnique({ where: { id } });
    if (!existing) {
        throw new httpError_1.HttpError(404, 'Recurring template not found');
    }
    const template = await prisma_1.prisma.recurringExpenseTemplate.update({
        where: { id },
        data: {
            name: input.name?.trim(),
            expenseAccountId: input.expenseAccountId,
            payFromAccountId: input.payFromAccountId === undefined ? undefined : input.payFromAccountId?.trim() || null,
            amount: input.amount !== undefined ? new client_1.Prisma.Decimal(input.amount) : undefined,
            frequency: input.frequency,
            dayOfMonth: input.dayOfMonth === undefined ? undefined : input.dayOfMonth || null,
            active: input.active,
            notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
        },
    });
    return toDto(template);
}
async function deleteRecurringTemplate(id) {
    const existing = await prisma_1.prisma.recurringExpenseTemplate.findUnique({ where: { id } });
    if (!existing) {
        throw new httpError_1.HttpError(404, 'Recurring template not found');
    }
    await prisma_1.prisma.recurringExpenseTemplate.delete({ where: { id } });
}
function monthDate(year, month, dayOfMonth) {
    const day = Math.min(Math.max(dayOfMonth || 1, 1), 31);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10);
}
async function postRecurringTemplate(id, year, month) {
    const template = await prisma_1.prisma.recurringExpenseTemplate.findUnique({ where: { id } });
    if (!template) {
        throw new httpError_1.HttpError(404, 'Recurring template not found');
    }
    const duplicate = await prisma_1.prisma.recurringExpensePost.findUnique({
        where: { templateId_year_month: { templateId: id, year, month } },
    });
    if (duplicate) {
        throw new httpError_1.HttpError(409, 'Recurring template already posted for this month');
    }
    if (!template.payFromAccountId) {
        throw new httpError_1.HttpError(400, 'Pay from account is required');
    }
    const voucher = await (0, module_service_1.createVoucher)({
        vtype: 'journal',
        vdate: monthDate(year, month, template.dayOfMonth || 1),
        narration: `Recurring: ${template.name}`,
        rows: [
            { accountId: template.expenseAccountId, dr: toNumber(template.amount), cr: 0, memo: template.name },
            { accountId: template.payFromAccountId, dr: 0, cr: toNumber(template.amount), memo: template.name },
        ],
    });
    await prisma_1.prisma.recurringExpensePost.create({
        data: {
            templateId: template.id,
            year,
            month,
            voucherId: voucher.id,
            voucherNo: voucher.voucherNo,
        },
    });
    await prisma_1.prisma.recurringExpenseTemplate.update({
        where: { id: template.id },
        data: { lastPostedDate: new Date() },
    });
    return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
    };
}
