import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../httpError';
import { verifyAccessToken } from '../jwt';

export type AuthUser = {
  userId: string;
  email: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized');
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.authUser = payload;
    next();
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      throw new HttpError(401, 'Unauthorized');
    }
    if (!roles.includes(req.authUser.role)) {
      throw new HttpError(403, 'Forbidden');
    }
    next();
  };
}
