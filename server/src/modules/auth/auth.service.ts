import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { signAccessToken } from '../../common/jwt';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}
