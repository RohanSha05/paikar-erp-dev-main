import { Router } from 'express';
import * as controller from './module.controller';
import { requireAuth, requireRole } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createDriverTripSchema, updateDriverTripSchema } from './module.validator';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post(
	'/',
	requireAuth,
	requireRole(['ADMIN', 'OPERATOR']),
	validate(createDriverTripSchema),
	controller.create
);
router.patch(
	'/:id',
	requireAuth,
	requireRole(['ADMIN', 'OPERATOR']),
	validate(updateDriverTripSchema),
	controller.update
);

router.post(
	'/:id/settle',
	requireAuth,
	requireRole(['ADMIN', 'OPERATOR']),
	controller.settle
);

export default router;