import { Request, Response } from 'express';
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
	const party = await service.updateParty(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'Party updated',
		data: party
	});
}
