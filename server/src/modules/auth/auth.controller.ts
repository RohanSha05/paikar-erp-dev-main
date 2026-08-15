import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
}

export async function me(req: Request, res: Response) {
  return res.json({
    success: true,
    data: req.authUser
  });
}
