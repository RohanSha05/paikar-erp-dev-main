import { Request, Response } from 'express';
import * as service from './module.service';

export async function list(_req: Request, res: Response) {
	const templates = await service.listRecurringTemplates();
	return res.json({ success: true, data: templates });
}

export async function create(req: Request, res: Response) {
	const template = await service.createRecurringTemplate(req.body);
	return res.status(201).json({ success: true, message: 'Recurring template created', data: template });
}

export async function update(req: Request, res: Response) {
	const template = await service.updateRecurringTemplate(req.params.id, req.body);
	return res.json({ success: true, message: 'Recurring template updated', data: template });
}

export async function remove(req: Request, res: Response) {
	await service.deleteRecurringTemplate(req.params.id);
	return res.json({ success: true, message: 'Recurring template deleted' });
}

export async function post(req: Request, res: Response) {
	const year = Number(req.query.year || new Date().getFullYear());
	const month = Number(req.query.month || new Date().getMonth() + 1);
	const postDate = typeof req.query.postDate === 'string' ? req.query.postDate : undefined;
	const result = await service.postRecurringTemplate(req.params.id, year, month, postDate);
	return res.json({ success: true, message: 'Recurring template posted', data: result });
}
