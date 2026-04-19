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

export async function settle(req: Request, res: Response) {
	const { payAccountId, payNowAmount, memo, settledAt } = req.body || {};
	const trip = await service.settleDriverTrip(req.params.id, {
		payAccountId,
		payNowAmount,
		memo,
		settledAt,
	});
	return res.json({
		success: true,
		message: 'Driver trip settled',
		data: trip,
	});
}