import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const drivers = await service.listDrivers();
	return res.json({ success: true, data: drivers });
}

export async function create(req: Request, res: Response) {
	const driver = await service.createDriver(req.body);
	return res.status(201).json({
		success: true,
		message: 'Driver created',
		data: driver
	});
}

export async function update(req: Request, res: Response) {
	const driver = await service.updateDriver(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'Driver updated',
		data: driver
	});
}