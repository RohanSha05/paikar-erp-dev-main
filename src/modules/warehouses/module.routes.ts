import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createWarehouseSchema, updateWarehouseSchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createWarehouseSchema), controller.create);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(updateWarehouseSchema), controller.update);

export default router;
