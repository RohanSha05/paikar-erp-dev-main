import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { purchaseOrderIdParamSchema, yearQuerySchema } from './module.validator';

const router = Router();

router.get('/expenses', requireAuth, validate(yearQuerySchema), controller.expenseSummary);
router.get(
	'/purchase-orders/:id/fulfillment',
	requireAuth,
	validate(purchaseOrderIdParamSchema),
	controller.purchaseOrderFulfillment,
);
router.get(
	'/purchase-orders/:id/remaining-stock',
	requireAuth,
	validate(purchaseOrderIdParamSchema),
	controller.purchaseOrderRemainingStock,
);
router.get(
	'/purchase-orders/:id/sold-percent',
	requireAuth,
	validate(purchaseOrderIdParamSchema),
	controller.purchaseOrderSoldPercent,
);

export default router;
