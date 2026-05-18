import { Request, Response } from 'express';
import * as service from './module.service';
import { InventoryDashboardQuery, StockCardQuery } from './module.types';
import { InventoryReportQuery } from './module.types';

function firstString(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length ? trimmed : undefined;
	}
	if (Array.isArray(value) && typeof value[0] === 'string') {
		const trimmed = value[0].trim();
		return trimmed.length ? trimmed : undefined;
	}
	return undefined;
}

function toPositiveInt(value: unknown, fallback: number): number {
	const text = firstString(value);
	if (!text) return fallback;
	const n = Number(text);
	return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toBool(value: unknown): boolean | undefined {
	const text = firstString(value)?.toLowerCase();
	if (!text) return undefined;
	if (text === 'true' || text === '1') return true;
	if (text === 'false' || text === '0') return false;
	return undefined;
}

function parseDashboardQuery(query: Request['query']): InventoryDashboardQuery {
	const sortByRaw = firstString(query.sortBy);
	const sortDirRaw = firstString(query.sortDir);

	const sortBy: InventoryDashboardQuery['sortBy'] =
		sortByRaw === 'availableKg' || sortByRaw === 'avgCostPerKg'
			? sortByRaw
			: 'createdAt';
	const sortDir: InventoryDashboardQuery['sortDir'] =
		sortDirRaw === 'asc' ? 'asc' : 'desc';

	return {
		q: firstString(query.q),
		warehouseId: firstString(query.warehouseId),
		productId: firstString(query.productId),
		availableOnly: toBool(query.availableOnly),
		page: toPositiveInt(query.page, 1),
		pageSize: toPositiveInt(query.pageSize, 20),
		sortBy,
		sortDir,
	};
}

function parseStockCardQuery(query: Request['query']): StockCardQuery {
	const sortDirRaw = firstString(query.sortDir);
	const sortDir: StockCardQuery['sortDir'] = sortDirRaw === 'asc' ? 'asc' : 'desc';

	return {
		lotId: firstString(query.lotId),
		warehouseId: firstString(query.warehouseId),
		from: firstString(query.from),
		to: firstString(query.to),
		page: toPositiveInt(query.page, 1),
		pageSize: toPositiveInt(query.pageSize, 100),
		sortDir,
	};
}

function parseReportQuery(query: Request['query']): InventoryReportQuery {
	const ttRaw = firstString(query.transactionType);
	const transactionType: 'all' | 'purchase' | 'sale' =
		ttRaw === 'purchase' || ttRaw === 'sale' ? ttRaw : 'all';

	function toPositiveIntLocal(value: unknown, fallback: number): number {
		const text = firstString(value);
		if (!text) return fallback;
		const n = Number(text);
		return Number.isInteger(n) && n > 0 ? n : fallback;
	}

	return {
		from: firstString(query.from),
		to: firstString(query.to),
		transactionType,
		partyId: firstString(query.partyId),
		warehouseId: firstString(query.warehouseId),
		productId: firstString(query.productId),
		productCategory: firstString(query.productCategory),
		q: firstString(query.q),
		page: toPositiveIntLocal(query.page, 1),
		pageSize: toPositiveIntLocal(query.pageSize, 100),
	};
}

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

export async function dashboard(req: Request, res: Response) {
	const data = await service.getInventoryDashboard(parseDashboardQuery(req.query));
	return res.json({
		success: true,
		message: 'Inventory dashboard data loaded',
		data
	});
}

export async function report(req: Request, res: Response) {
	const data = await service.getInventoryReport(parseReportQuery(req.query));
	return res.json({
		success: true,
		message: 'Inventory report loaded',
		data
	});
}

export async function stockCard(req: Request, res: Response) {
	const data = await service.getStockCard(parseStockCardQuery(req.query));
	return res.json({
		success: true,
		message: 'Stock card data loaded',
		data
	});
}

export async function reconcile(req: Request, res: Response) {
  const data = await service.reconcileAllLots();
  return res.json({ success: true, message: 'Reconciliation complete', data });
}
