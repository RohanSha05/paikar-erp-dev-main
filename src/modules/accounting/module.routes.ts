import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createAccountSchema } from './module.validator';
import { upsertPartyAccountOpening } from './module.service';

const router = Router();

router.get('/accounts', requireAuth, controller.listAccounts);
router.post('/accounts', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createAccountSchema), controller.createAccount);
router.get('/daybook', requireAuth, controller.getDaybook);
router.get('/ledger', requireAuth, controller.getLedger);
router.get('/trial-balance', requireAuth, controller.getTrialBalance);
router.get('/expenses', requireAuth, controller.getExpenseSummary);
router.get('/report-meta', requireAuth, controller.getReportMeta);
router.post(
  '/party-account/upsert-opening',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  async (req, res, next) => {
    try {
      const result = await upsertPartyAccountOpening(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
