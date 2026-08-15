import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createInvestorSchema,
  updateInvestorSchema,
  postInvestorTxnSchema,
} from './module.validator';

const router = Router();

// List investors
router.get('/', requireAuth, controller.list);

// Create investor
router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  validate(createInvestorSchema),
  controller.create
);

// Get specific investor
router.get('/:id', requireAuth, controller.get);

// Update investor
router.patch(
  '/:id',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  validate(updateInvestorSchema),
  controller.update
);

// Delete investor
router.delete(
  '/:id',
  requireAuth,
  requireRole(['ADMIN']),
  controller.remove
);

// Get investor's transactions
router.get('/:id/txns', requireAuth, controller.getTxns);

// Post investor transaction
router.post(
  '/:id/txns',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  validate(postInvestorTxnSchema),
  controller.postTxn
);

// Get investor balance
router.get('/:id/balance', requireAuth, controller.getBalance);

export default router;
