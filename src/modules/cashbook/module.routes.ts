import { Router } from 'express';
import {
  getAccounts,
  getParties,
  createPartyHandler,
  resolvePartyAccountHandler,
  createVoucherHandler,
  getVouchers,
  getDraftVouchers,
  createDraftVoucherHandler,
  updateDraftVoucherHandler,
  deleteDraftVoucherHandler,
  approveDraftVoucherHandler,
} from './module.controller';
import { requireAuth } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createPartySchema,
  createVoucherSchema,
  createDraftVoucherSchema,
  updateDraftVoucherSchema,
  draftVoucherParamsSchema,
} from './module.validator';

const router = Router();

/**
 * GET /api/v1/cashbook/parties
 * List all party accounts
 */
router.get('/parties', requireAuth, getParties);

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

router.get('/vouchers/drafts', requireAuth, getDraftVouchers);

router.post(
  '/vouchers/drafts',
  requireAuth,
  validate(createDraftVoucherSchema),
  createDraftVoucherHandler,
);

router.patch(
  '/vouchers/drafts/:id',
  requireAuth,
  validate(draftVoucherParamsSchema),
  validate(updateDraftVoucherSchema),
  updateDraftVoucherHandler,
);

router.delete(
  '/vouchers/drafts/:id',
  requireAuth,
  validate(draftVoucherParamsSchema),
  deleteDraftVoucherHandler,
);

router.post(
  '/vouchers/drafts/:id/approve',
  requireAuth,
  validate(draftVoucherParamsSchema),
  approveDraftVoucherHandler,
);

export default router;
