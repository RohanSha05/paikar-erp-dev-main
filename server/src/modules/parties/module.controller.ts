import { Request, Response } from 'express';
import { HttpError } from '../../common/httpError';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const parties = await service.listParties();
	return res.json({ success: true, data: parties });
}

export async function create(req: Request, res: Response) {
	const party = await service.createParty(req.body);
	return res.status(201).json({
		success: true,
		message: 'Party created',
		data: party
	});
}

export async function update(req: Request, res: Response) {
	const { id } = req.params;
	if (!id || typeof id !== 'string' || !id.trim()) {
		throw new HttpError(400, 'Invalid party ID');
	}
	const party = await service.updateParty(id, req.body);
	return res.json({
		success: true,
		message: 'Party updated',
		data: party
	});
}

export async function remove(req: Request, res: Response) {
	const { id } = req.params;
	if (!id || typeof id !== 'string' || !id.trim()) {
		throw new HttpError(400, 'Invalid party ID');
	}
	const result = await service.deleteParty(id);
	return res.json({
		success: true,
		message: 'Party deleted',
		data: result
	});
}
