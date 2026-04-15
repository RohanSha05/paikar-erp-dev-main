"use strict";
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
async function getParties(req, res, next) {
    try {
        const kind = req.query.kind;
        const parties = await (0, module_service_1.listParties)(kind);
        res.json({
            success: true,
            data: parties,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/v1/cashbook/parties
 * Create a party
 */
async function createPartyHandler(req, res, next) {
    try {
        const party = await (0, module_service_1.createParty)(req.body);
        res.status(201).json({
            success: true,
            data: party,
            message: 'Party created successfully',
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/v1/cashbook/parties/:partyId/account
 * Resolve (or create) ledger account for a party
 */
async function resolvePartyAccountHandler(req, res, next) {
    try {
        const partyId = req.params.partyId;
        const account = await (0, module_service_1.resolvePartyAccount)(partyId);
        res.json({
            success: true,
            data: account,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/v1/cashbook/accounts
 * List all active accounts, optionally filtered by type
 */
async function getAccounts(req, res, next) {
    try {
        const filterByType = req.query.type;
        const accounts = await (0, module_service_1.listAccounts)(filterByType);
        res.json({
            success: true,
            data: accounts,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/v1/cashbook/vouchers
 * Create a new voucher (payment, receipt, journal, contra)
 */
async function createVoucherHandler(req, res, next) {
    try {
        const input = req.body;
        const voucher = await (0, module_service_1.createVoucher)(input);
        res.status(201).json({
            success: true,
            data: voucher,
            message: `Voucher ${voucher.voucherNo} created successfully`,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/v1/cashbook/vouchers
 * List vouchers with optional date range
 */
async function getVouchers(req, res, next) {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const vouchers = await (0, module_service_1.listVouchers)(startDate, endDate);
        res.json({
            success: true,
            data: vouchers,
        });
    }
    catch (error) {
        next(error);
    }
}
