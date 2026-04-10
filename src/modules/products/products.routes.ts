import { Router } from 'express';
import * as controller from './products.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createProductSchema, updateProductSchema } from './products.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createProductSchema), controller.create);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(updateProductSchema), controller.update);

export default router;
