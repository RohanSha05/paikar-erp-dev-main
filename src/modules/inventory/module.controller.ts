import { Request, Response } from 'express';
import * as service from './module.service';

export async function adjust(req: Request, res: Response) {
	const data = await service.adjustStock(req.body);
	return res.json({
		success: true,
		message: 'Stock adjusted',
		data
	});
}

export async function transfer(req: Request, res: Response) {
	const data = await service.transferStock(req.body);
	return res.json({
		success: true,
		message: 'Stock transferred',
		data
	});
}
