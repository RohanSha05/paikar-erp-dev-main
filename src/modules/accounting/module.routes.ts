import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createAccountSchema } from './module.validator';

const router = Router();

router.get('/accounts', requireAuth, controller.listAccounts);
router.post('/accounts', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createAccountSchema), controller.createAccount);
router.get('/daybook', requireAuth, controller.getDaybook);
router.get('/ledger', requireAuth, controller.getLedger);
router.get('/trial-balance', requireAuth, controller.getTrialBalance);
router.get('/expenses', requireAuth, controller.getExpenseSummary);

export default router;
