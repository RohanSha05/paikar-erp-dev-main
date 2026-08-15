"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecurringTemplates = listRecurringTemplates;
exports.createRecurringTemplate = createRecurringTemplate;
exports.updateRecurringTemplate = updateRecurringTemplate;
exports.deleteRecurringTemplate = deleteRecurringTemplate;
exports.postRecurringTemplate = postRecurringTemplate;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const httpError_1 = require("../../common/httpError");
const sequence_id_1 = require("../../common/utils/sequence-id");
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
function listRecurringTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        const templates = yield prisma_1.prisma.recurringExpenseTemplate.findMany({
            orderBy: [{ createdAt: 'desc' }],
        });
        return templates.map(toDto);
    });
}
function createRecurringTemplate(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const template = yield prisma_1.prisma.recurringExpenseTemplate.create({
            data: {
                name: input.name.trim(),
                expenseAccountId: input.expenseAccountId,
                payFromAccountId: ((_a = input.payFromAccountId) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                amount: new client_1.Prisma.Decimal(input.amount),
                frequency: input.frequency,
                dayOfMonth: input.dayOfMonth || null,
                active: input.active !== false,
                notes: ((_b = input.notes) === null || _b === void 0 ? void 0 : _b.trim()) || null,
            },
        });
        return toDto(template);
    });
}
function updateRecurringTemplate(id, input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const existing = yield prisma_1.prisma.recurringExpenseTemplate.findUnique({ where: { id } });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Recurring template not found');
        }
        const template = yield prisma_1.prisma.recurringExpenseTemplate.update({
            where: { id },
            data: {
                name: (_a = input.name) === null || _a === void 0 ? void 0 : _a.trim(),
                expenseAccountId: input.expenseAccountId,
                payFromAccountId: input.payFromAccountId === undefined ? undefined : ((_b = input.payFromAccountId) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                amount: input.amount !== undefined ? new client_1.Prisma.Decimal(input.amount) : undefined,
                frequency: input.frequency,
                dayOfMonth: input.dayOfMonth === undefined ? undefined : input.dayOfMonth || null,
                active: input.active,
                notes: input.notes === undefined ? undefined : ((_c = input.notes) === null || _c === void 0 ? void 0 : _c.trim()) || null,
            },
        });
        return toDto(template);
    });
}
function deleteRecurringTemplate(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.recurringExpenseTemplate.findUnique({ where: { id } });
        if (!existing) {
            throw new httpError_1.HttpError(404, 'Recurring template not found');
        }
        yield prisma_1.prisma.recurringExpenseTemplate.delete({ where: { id } });
    });
}
function monthDate(year, month, dayOfMonth) {
    const day = Math.min(Math.max(dayOfMonth || 1, 1), 31);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10);
}
function resolveAccountIdByCodeOrId(tx, value) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = value.trim();
        if (!key) {
            throw new httpError_1.HttpError(400, 'Account reference is required');
        }
        const account = yield tx.account.findFirst({
            where: {
                OR: [{ id: key }, { code: key }],
            },
            select: { id: true },
        });
        if (!account) {
            throw new httpError_1.HttpError(404, `Account not found: ${key}`);
        }
        return account.id;
    });
}
function postRecurringTemplate(id, year, month) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            const template = yield tx.recurringExpenseTemplate.findUnique({ where: { id } });
            if (!template) {
                throw new httpError_1.HttpError(404, 'Recurring template not found');
            }
            const duplicate = yield tx.recurringExpensePost.findUnique({
                where: { templateId_year_month: { templateId: id, year, month } },
            });
            if (duplicate) {
                throw new httpError_1.HttpError(409, 'Recurring template already posted for this month');
            }
            if (!template.payFromAccountId) {
                throw new httpError_1.HttpError(400, 'Pay from account is required');
            }
            const expenseAccountId = yield resolveAccountIdByCodeOrId(tx, template.expenseAccountId);
            const payFromAccountId = yield resolveAccountIdByCodeOrId(tx, template.payFromAccountId);
            const voucherDateText = monthDate(year, month, template.dayOfMonth || 1);
            const voucherDate = new Date(`${voucherDateText}T00:00:00.000Z`);
            const voucher = yield tx.voucher.create({
                data: {
                    voucherNo: yield (0, sequence_id_1.nextDailySequenceIdForDelegate)(tx.voucher, 'voucherNo', 'VCH', voucherDate),
                    vtype: 'journal',
                    vdate: voucherDate,
                    narration: `Recurring: ${template.name}`,
                },
            });
            yield tx.voucherRow.createMany({
                data: [
                    {
                        voucherId: voucher.id,
                        accountId: expenseAccountId,
                        dr: new client_1.Prisma.Decimal(toNumber(template.amount)),
                        cr: new client_1.Prisma.Decimal(0),
                        memo: template.name,
                    },
                    {
                        voucherId: voucher.id,
                        accountId: payFromAccountId,
                        dr: new client_1.Prisma.Decimal(0),
                        cr: new client_1.Prisma.Decimal(toNumber(template.amount)),
                        memo: template.name,
                    },
                ],
            });
            yield tx.recurringExpensePost.create({
                data: {
                    templateId: template.id,
                    year,
                    month,
                    voucherId: voucher.id,
                    voucherNo: voucher.voucherNo,
                },
            });
            yield tx.recurringExpenseTemplate.update({
                where: { id: template.id },
                data: { lastPostedDate: new Date() },
            });
            return {
                voucherId: voucher.id,
                voucherNo: voucher.voucherNo,
            };
        }));
    });
}
