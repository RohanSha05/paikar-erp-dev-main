import { Router } from 'express';
import * as controller from './purchase.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  approvePurchaseOrderSchema,
  createPurchaseOrderSchema,
  getPurchaseOrderSchema,
  updatePurchaseOrderSchema
} from './purchase.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, validate(getPurchaseOrderSchema), controller.getById);

router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  validate(createPurchaseOrderSchema),
  controller.createDraft
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(['ADMIN', 'OPERATOR']),
  validate(updatePurchaseOrderSchema),
  controller.updateDraft
);

router.post(
  '/:id/approve',
  requireAuth,
  requireRole(['ADMIN']),
  validate(approvePurchaseOrderSchema),
  controller.approve
);

export default router;
