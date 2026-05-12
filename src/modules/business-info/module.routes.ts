import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createOrUpdateBusinessInfoSchema, updateBusinessInfoSchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, controller.get);
router.get('/all', requireAuth, controller.getAll);
router.post(
	'/',
	requireAuth,
	requireRole(['ADMIN']),
	validate(createOrUpdateBusinessInfoSchema),
	controller.createOrUpdate
);
router.patch(
	'/:id',
	requireAuth,
	requireRole(['ADMIN']),
	validate(updateBusinessInfoSchema),
	controller.update
);
router.delete(
	'/:id',
	requireAuth,
	requireRole(['ADMIN']),
	controller.remove
);

export default router;
