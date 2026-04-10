import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const users = await service.listUsers();
	return res.json({ success: true, data: users });
}

export async function create(req: Request, res: Response) {
	const user = await service.createUser(req.body);
	return res.status(201).json({
		success: true,
		message: 'User created',
		data: user
	});
}

export async function update(req: Request, res: Response) {
	const user = await service.updateUser(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'User updated',
		data: user
	});
}
