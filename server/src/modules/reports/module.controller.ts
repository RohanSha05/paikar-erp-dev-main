import { Request, Response } from 'express';
import * as service from './module.service';

export async function expenseSummary(req: Request, res: Response) {
	const yearValue = typeof req.query.year === 'string' ? Number(req.query.year) : new Date().getFullYear();
	const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
	const data = await service.getExpenseSummary(year);
	return res.json({ success: true, data });
}

export async function purchaseOrderRemainingStock(req: Request, res: Response) {
	const data = await service.getPurchaseOrderRemainingStock(req.params.id);
	return res.json({ success: true, data });
}

export async function purchaseOrderFulfillment(req: Request, res: Response) {
	const data = await service.getPurchaseOrderFulfillment(req.params.id);
	return res.json({ success: true, data });
}

export async function purchaseOrderSoldPercent(req: Request, res: Response) {
	const data = await service.getPurchaseOrderSoldPercent(req.params.id);
	return res.json({ success: true, data });
}
