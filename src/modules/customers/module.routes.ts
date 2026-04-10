import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createCustomerSchema), controller.create);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(updateCustomerSchema), controller.update);

export default router;
