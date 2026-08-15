import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { listLotsSchema } from './module.validator';
import * as controller from './module.controller';

const router = Router();

router.get('/', requireAuth, validate(listLotsSchema), controller.list);

export default router;
