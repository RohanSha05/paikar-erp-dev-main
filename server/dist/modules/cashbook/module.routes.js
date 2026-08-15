"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const module_controller_1 = require("./module.controller");
const auth_1 = require("../../common/middleware/auth");
const validate_1 = require("../../common/middleware/validate");
const module_validator_1 = require("./module.validator");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/cashbook/parties
 * List all party accounts
 */
router.get('/parties', auth_1.requireAuth, module_controller_1.getParties);
/**
 * POST /api/v1/cashbook/parties
 * Create party
 */
router.post('/parties', auth_1.requireAuth, (0, validate_1.validate)(module_validator_1.createPartySchema), module_controller_1.createPartyHandler);
/**
 * POST /api/v1/cashbook/parties/:partyId/account
 * Resolve (or create) party ledger account
 */
router.post('/parties/:partyId/account', auth_1.requireAuth, module_controller_1.resolvePartyAccountHandler);
/**
 * GET /api/v1/cashbook/accounts
 * List all active accounts
 */
router.get('/accounts', auth_1.requireAuth, module_controller_1.getAccounts);
/**
 * POST /api/v1/cashbook/vouchers
 * Create a new voucher
 */
router.post('/vouchers', auth_1.requireAuth, (0, validate_1.validate)(module_validator_1.createVoucherSchema), module_controller_1.createVoucherHandler);
/**
 * GET /api/v1/cashbook/vouchers
 * List vouchers
 */
router.get('/vouchers', auth_1.requireAuth, module_controller_1.getVouchers);
exports.default = router;
