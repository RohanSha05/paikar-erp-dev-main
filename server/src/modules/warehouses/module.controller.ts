import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const warehouses = await service.listWarehouses();
	return res.json({ success: true, data: warehouses });
}

export async function create(req: Request, res: Response) {
	const warehouse = await service.createWarehouse(req.body);
	return res.status(201).json({
		success: true,
		message: 'Warehouse created',
		data: warehouse
	});
}

export async function update(req: Request, res: Response) {
	const warehouse = await service.updateWarehouse(req.params.id, req.body);
	return res.json({
		success: true,
		message: 'Warehouse updated',
		data: warehouse
	});
}
