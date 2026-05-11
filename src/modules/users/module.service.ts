import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { CreateUserInput, UpdateUserInput } from './module.types';

const SALT_ROUNDS = 10;

export async function listUsers() {
	return prisma.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			active: true,
			createdAt: true,
			updatedAt: true
		},
		orderBy: { createdAt: 'desc' }
	});
}

export async function createUser(input: CreateUserInput) {
	const existing = await prisma.user.findUnique({ where: { email: input.email } });
	if (existing) {
		throw new HttpError(409, 'Email already exists');
	}

	const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

	return prisma.user.create({
		data: {
			name: input.name,
			email: input.email,
			passwordHash,
			role: input.role,
			active: input.active
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			active: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function updateUser(id: string, input: UpdateUserInput) {
	const user = await prisma.user.findUnique({ where: { id } });
	if (!user) {
		throw new HttpError(404, 'User not found');
	}

	let passwordHash: string | undefined;
	if (input.password) {
		passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
	}

	return prisma.user.update({
		where: { id },
		data: {
			name: input.name,
			role: input.role,
			active: input.active,
			...(passwordHash ? { passwordHash } : {})
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			active: true,
			createdAt: true,
			updatedAt: true
		}
	});
}

export async function deleteUser(id: string) {
	// Find the oldest user — they cannot be deleted
	const oldest = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
	if (oldest?.id === id) {
		throw new HttpError(403, 'The first user cannot be deleted');
	}
 
	const user = await prisma.user.findUnique({ where: { id } });
	if (!user) {
		throw new HttpError(404, 'User not found');
	}
 
	return prisma.user.delete({ where: { id } });
}
