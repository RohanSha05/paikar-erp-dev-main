import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  confirmSalesOrderParamsSchema,
  deleteSalesOrderSchema,
  createSalesOrderSchema,
  updateSalesOrderSchema
} from './sales.schema';
import {
  confirmSalesOrderHandler,
  createSalesOrderHandler,
  deleteSalesOrderHandler,
  getSalesOrderByIdHandler,
  listSalesOrdersHandler,
  updateSalesOrderHandler
} from './sales.controller';

const router = Router();

router.get('/sales-orders', requireAuth, listSalesOrdersHandler);
router.get('/sales-orders/:id', requireAuth, validate(confirmSalesOrderParamsSchema), getSalesOrderByIdHandler);
router.post('/sales-orders', requireAuth, validate(createSalesOrderSchema), createSalesOrderHandler);
router.patch('/sales-orders/:id', requireAuth, validate(updateSalesOrderSchema), updateSalesOrderHandler);
router.post('/sales-orders/:id/confirm', requireAuth, validate(confirmSalesOrderParamsSchema), confirmSalesOrderHandler);
router.delete('/sales-orders/:id', requireAuth, validate(deleteSalesOrderSchema), deleteSalesOrderHandler);

export default router;