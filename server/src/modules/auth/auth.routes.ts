import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { loginSchema } from './auth.validator';
import { requireAuth } from '../../common/middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), controller.login);
router.get('/me', requireAuth, controller.me);

export default router;
