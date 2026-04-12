import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { adjustStockSchema, transferStockSchema } from './module.validator';

const router = Router();

router.post(
	'/adjust',
	requireAuth,
	requireRole(['ADMIN', 'OPERATOR']),
	validate(adjustStockSchema),
	controller.adjust
);

router.post(
	'/transfer',
	requireAuth,
	requireRole(['ADMIN', 'OPERATOR']),
	validate(transferStockSchema),
	controller.transfer
);

export default router;
