import { Request, Response } from 'express';
import * as service from './module.service';

export async function get(_req: Request, res: Response) {
	const info = await service.getBusinessInfo();
	return res.json({ success: true, data: info });
}

export async function getAll(_req: Request, res: Response) {
	const info = await service.getAllBusinessInfo();
	return res.json({ success: true, data: info });
}

export async function createOrUpdate(req: Request, res: Response) {
	const info = await service.createOrUpdateBusinessInfo(req.body);
	return res.status(200).json({
		success: true,
		message: 'Business info saved',
		data: info
	});
}

export async function update(req: Request, res: Response) {
	const info = await service.updateBusinessInfo(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'Business info updated',
		data: info
	});
}

export async function remove(req: Request, res: Response) {
	const info = await service.deleteBusinessInfo(req.params.id);
	return res.json({
		success: true,
		message: 'Business info deleted',
		data: info
	});
}
