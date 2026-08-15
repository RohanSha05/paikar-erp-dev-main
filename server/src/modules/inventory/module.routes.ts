import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
	adjustStockSchema,
	transferStockSchema,
	inventoryDashboardSchema,
	stockCardQuerySchema
} from './module.validator';

const router = Router();

router.get('/dashboard', requireAuth, validate(inventoryDashboardSchema), controller.dashboard);
router.get('/stock-card', requireAuth, validate(stockCardQuerySchema), controller.stockCard);

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
