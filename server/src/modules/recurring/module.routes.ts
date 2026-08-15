import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { recurringTemplateSchema, updateRecurringTemplateSchema } from './module.validator';

const router = Router();

router.get('/templates', requireAuth, controller.list);
router.post('/templates', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(recurringTemplateSchema), controller.create);
router.patch('/templates/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), validate(updateRecurringTemplateSchema), controller.update);
router.delete('/templates/:id', requireAuth, requireRole(['ADMIN', 'OPERATOR']), controller.remove);
router.post('/templates/:id/post', requireAuth, requireRole(['ADMIN', 'OPERATOR']), controller.post);

export default router;
