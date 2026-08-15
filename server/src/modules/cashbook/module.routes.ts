import { Router } from 'express';
import {
  getAccounts,
  getParties,
  createPartyHandler,
  resolvePartyAccountHandler,
  createVoucherHandler,
  getVouchers,
} from './module.controller';
import { requireAuth } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createPartySchema, createVoucherSchema } from './module.validator';

const router = Router();

/**
 * GET /api/v1/cashbook/parties
 * List all party accounts
 */
router.get('/parties', requireAuth, getParties);

/**
 * POST /api/v1/cashbook/parties
 * Create party
 */
router.post('/parties', requireAuth, validate(createPartySchema), createPartyHandler);

/**
 * POST /api/v1/cashbook/parties/:partyId/account
 * Resolve (or create) party ledger account
 */
router.post('/parties/:partyId/account', requireAuth, resolvePartyAccountHandler);

/**
 * GET /api/v1/cashbook/accounts
 * List all active accounts
 */
router.get('/accounts', requireAuth, getAccounts);

/**
 * POST /api/v1/cashbook/vouchers
 * Create a new voucher
 */
router.post(
  '/vouchers',
  requireAuth,
  validate(createVoucherSchema),
  createVoucherHandler,
);

/**
 * GET /api/v1/cashbook/vouchers
 * List vouchers
 */
router.get('/vouchers', requireAuth, getVouchers);

export default router;
