import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createPartySchema, deletePartySchema, updatePartySchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(createPartySchema), controller.create);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(updatePartySchema), controller.update);
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(deletePartySchema), controller.remove);

export default router;
