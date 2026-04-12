import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const trips = await service.listDriverTrips();
	return res.json({ success: true, data: trips });
}

export async function create(req: Request, res: Response) {
	const trip = await service.createDriverTrip(req.body);
	return res.status(201).json({
		success: true,
		message: 'Driver trip created',
		data: trip
	});
}

export async function update(req: Request, res: Response) {
	const trip = await service.updateDriverTrip(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'Driver trip updated',
		data: trip
	});
}