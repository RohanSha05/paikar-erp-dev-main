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
exports.getParties = getParties;
exports.createPartyHandler = createPartyHandler;
exports.resolvePartyAccountHandler = resolvePartyAccountHandler;
exports.getAccounts = getAccounts;
exports.createVoucherHandler = createVoucherHandler;
exports.getVouchers = getVouchers;
const module_service_1 = require("./module.service");
/**
 * GET /api/v1/cashbook/parties
 * List all party accounts, optionally filtered by kind
 */
function getParties(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const kind = req.query.kind;
            const parties = yield (0, module_service_1.listParties)(kind);
            res.json({
                success: true,
                data: parties,
            });
        }
        catch (error) {
            next(error);
        }
    });
}
/**
 * POST /api/v1/cashbook/parties
 * Create a party
 */
function createPartyHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const party = yield (0, module_service_1.createParty)(req.body);
            res.status(201).json({
                success: true,
                data: party,
                message: 'Party created successfully',
            });
        }
        catch (error) {
            next(error);
        }
    });
}
/**
 * POST /api/v1/cashbook/parties/:partyId/account
 * Resolve (or create) ledger account for a party
 */
function resolvePartyAccountHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const partyId = req.params.partyId;
            const account = yield (0, module_service_1.resolvePartyAccount)(partyId);
            res.json({
                success: true,
                data: account,
            });
        }
        catch (error) {
            next(error);
        }
    });
}
/**
 * GET /api/v1/cashbook/accounts
 * List all active accounts, optionally filtered by type
 */
function getAccounts(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const filterByType = req.query.type;
            const accounts = yield (0, module_service_1.listAccounts)(filterByType);
            res.json({
                success: true,
                data: accounts,
            });
        }
        catch (error) {
            next(error);
        }
    });
}
/**
 * POST /api/v1/cashbook/vouchers
 * Create a new voucher (payment, receipt, journal, contra)
 */
function createVoucherHandler(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const input = req.body;
            const voucher = yield (0, module_service_1.createVoucher)(input);
            res.status(201).json({
                success: true,
                data: voucher,
                message: `Voucher ${voucher.voucherNo} created successfully`,
            });
        }
        catch (error) {
            next(error);
        }
    });
}
/**
 * GET /api/v1/cashbook/vouchers
 * List vouchers with optional date range
 */
function getVouchers(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const vouchers = yield (0, module_service_1.listVouchers)(startDate, endDate);
            res.json({
                success: true,
                data: vouchers,
            });
        }
        catch (error) {
            next(error);
        }
    });
}
