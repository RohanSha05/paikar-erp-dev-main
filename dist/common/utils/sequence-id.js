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
exports.nextDailySequenceIdForDelegate = nextDailySequenceIdForDelegate;
function datePartFrom(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}
function nextSequenceFrom(latest) {
    if (!latest)
        return 1;
    const match = latest.match(/-(\d+)$/);
    if (!match)
        return 1;
    return Number(match[1]) + 1;
}
function nextDailySequenceIdForDelegate(delegate_1, field_1, prefix_1) {
    return __awaiter(this, arguments, void 0, function* (delegate, field, prefix, date = new Date(), pad = 3) {
        const datePart = datePartFrom(date);
        const startsWith = `${prefix}-${datePart}-`;
        const latest = yield delegate.findFirst({
            where: {
                [field]: {
                    startsWith,
                },
            },
            orderBy: {
                [field]: 'desc',
            },
            select: {
                [field]: true,
            },
        });
        const latestValue = latest ? latest[field] : undefined;
        const next = nextSequenceFrom(latestValue);
        return `${prefix}-${datePart}-${String(next).padStart(pad, '0')}`;
    });
}
