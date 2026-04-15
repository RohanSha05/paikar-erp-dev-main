import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

export function signAccessToken(payload: JwtPayload): string {
  const signOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, signOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}
