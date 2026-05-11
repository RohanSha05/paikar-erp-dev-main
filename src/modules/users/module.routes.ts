import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createUserSchema, updateUserSchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, requireRole(['ADMIN']), controller.list);
router.post('/', requireAuth, requireRole(['ADMIN']), validate(createUserSchema), controller.create);
router.patch('/:id', requireAuth, requireRole(['ADMIN']), validate(updateUserSchema), controller.update);
router.delete('/:id', requireAuth, requireRole(['ADMIN']), controller.remove);


export default router;
