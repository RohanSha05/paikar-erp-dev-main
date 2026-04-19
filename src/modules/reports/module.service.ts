import { StockMoveReason, StockRefType } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { getExpenseSummary as getAccountingExpenseSummary } from '../accounting/module.service';
import type {
	ExpenseMonthSummaryDto,
	PurchaseOrderFulfillmentDto,
	PurchaseOrderRemainingStockDto,
	PurchaseOrderSoldPercentDto,
} from './module.types';

const KG_PER_MON = 40;

function toNumber(value: unknown) {
	return Number(value || 0);
}

function round1(value: number) {
	return Math.round(value * 10) / 10;
}

function round2(value: number) {
	return Math.round(value * 100) / 100;
}

function itemStockKg(item: {
	bagCount: number;
	actualKgPerBag: unknown;
	accountingKgPerBag: unknown;
	weightPolicy: string;
}) {
	const bags = toNumber(item.bagCount);
	const actualKg = bags * toNumber(item.actualKgPerBag);
	const accountingKg = bags * toNumber(item.accountingKgPerBag);
	return item.weightPolicy === 'actual' ? actualKg : accountingKg;
}

export async function getExpenseSummary(year: number): Promise<ExpenseMonthSummaryDto[]> {
	return getAccountingExpenseSummary(year);
}

export async function getPurchaseOrderFulfillment(poId: string): Promise<PurchaseOrderFulfillmentDto> {
	const po = await prisma.purchaseOrder.findUnique({
		where: { id: poId },
		include: {
			items: true,
			lots: {
				include: {
					product: true,
					warehouse: true,
				},
			},
		},
	});

	if (!po) {
		throw new HttpError(404, 'Purchase order not found');
	}

	const itemRows = (po.items || []).map((item) => {
		const itemLots = (po.lots || []).filter((lot) => lot.sourcePoItemId === item.id);
		const initialKg = round2(
			itemStockKg({
				bagCount: item.bagCount,
				actualKgPerBag: item.actualKgPerBag,
				accountingKgPerBag: item.accountingKgPerBag,
				weightPolicy: item.weightPolicy,
			}),
		);
		const remainingKg = round2(itemLots.reduce((sum, lot) => sum + toNumber(lot.availableKg), 0));

		return {
			poItemId: item.id,
			productType: item.productName || item.productId,
			initialKg,
			remainingKg,
			isSoldOut: remainingKg <= 0.00001,
			lots: itemLots.map((lot) => ({
				id: lot.id,
				label: lot.label,
				warehouseId: lot.warehouseId,
				warehouseName: lot.warehouse?.name || lot.warehouseId,
				remainingKg: round2(toNumber(lot.availableKg)),
			})),
		};
	});

	const remainingTotalKg = round2(itemRows.reduce((sum, row) => sum + row.remainingKg, 0));

	return {
		poId,
		isFullySold: remainingTotalKg <= 0.00001,
		remainingTotalKg,
		items: itemRows,
	};
}

export async function getPurchaseOrderRemainingStock(poId: string): Promise<PurchaseOrderRemainingStockDto> {
	const po = await prisma.purchaseOrder.findUnique({
		where: { id: poId },
		include: {
			lots: {
				include: {
					warehouse: true,
					product: true,
				},
			},
		},
	});

	if (!po) {
		throw new HttpError(404, 'Purchase order not found');
	}

	const lots = po.lots || [];
	const totalKg = lots.reduce((sum, lot) => sum + toNumber(lot.availableKg), 0);

	const byWarehouseMap = new Map<string, { warehouse: string; kg: number }>();
	const byProductMap = new Map<string, { productType: string; kg: number }>();

	for (const lot of lots) {
		const lotKg = toNumber(lot.availableKg);
		const warehouseName = lot.warehouse?.name || lot.warehouseId;
		const productType = lot.product?.name || lot.productId;

		const wh = byWarehouseMap.get(warehouseName) || {
			warehouse: warehouseName,
			kg: 0,
		};
		wh.kg += lotKg;
		byWarehouseMap.set(warehouseName, wh);

		const prod = byProductMap.get(productType) || {
			productType,
			kg: 0,
		};
		prod.kg += lotKg;
		byProductMap.set(productType, prod);
	}

	const fulfillment = await getPurchaseOrderFulfillment(poId);

	return {
		totalKg: round2(totalKg),
		totalMon: round2(totalKg / KG_PER_MON),
		lots: lots.map((lot) => ({
			id: lot.id,
			lotNo: lot.lotNo,
			label: lot.label,
			warehouseId: lot.warehouseId,
			warehouseName: lot.warehouse?.name || lot.warehouseId,
			productId: lot.productId,
			productName: lot.product?.name || lot.productId,
			productType: lot.product?.name || lot.productId,
			remainingKg: round2(toNumber(lot.availableKg)),
		})),
		byWarehouse: Array.from(byWarehouseMap.values())
			.map((x) => ({ ...x, kg: round2(x.kg) }))
			.sort((a, b) => b.kg - a.kg),
		byProduct: Array.from(byProductMap.values())
			.map((x) => ({ ...x, kg: round2(x.kg) }))
			.sort((a, b) => b.kg - a.kg),
		poId,
		isFullySold: totalKg <= 0.00001,
		remainingTotalKg: fulfillment.remainingTotalKg,
		items: fulfillment.items,
	};
}

export async function getPurchaseOrderSoldPercent(poId: string): Promise<PurchaseOrderSoldPercentDto> {
	const fulfillment = await getPurchaseOrderFulfillment(poId);

	let initialKg = fulfillment.items.reduce((sum, item) => sum + item.initialKg, 0);
	if (initialKg <= 0) {
		const purchaseMoves = await prisma.stockMove.aggregate({
			where: {
				reason: StockMoveReason.PURCHASE,
				refType: StockRefType.PO,
				refId: poId,
			},
			_sum: {
				qtyKg: true,
			},
		});
		initialKg = toNumber(purchaseMoves._sum.qtyKg);
	}

	const remainingKg = fulfillment.remainingTotalKg;
	const soldKg = Math.max(0, initialKg - remainingKg);
	const soldPct = initialKg > 0 ? (soldKg / initialKg) * 100 : 0;

	return {
		initialKg: round2(initialKg),
		soldKg: round2(soldKg),
		remainingKg: round2(remainingKg),
		soldPct: round1(soldPct),
		isFullySold: remainingKg <= 0.00001,
		poId,
	};
}
