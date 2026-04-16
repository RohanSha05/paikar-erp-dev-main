import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import {
	AdjustStockInput,
	TransferStockInput,
	InventoryDashboardQuery,
	StockCardQuery
} from './module.types';

function moveNo() {
	return `MV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function transferRef() {
	return `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function adjustmentRef() {
	return `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function transferLotNo() {
	return `LOT-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function transferLotLabel(productId: string, warehouseId: string) {
	return `LOT-TRF-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}-${Date.now()}`;
}

export async function adjustStock(input: AdjustStockInput) {
	return prisma.$transaction(async (tx) => {
		const lot = await tx.lot.findUnique({ where: { id: input.lotId } });
		if (!lot) throw new HttpError(404, 'Lot not found');

		const delta = input.mode === 'add' ? input.qtyKg : -input.qtyKg;
		const nextQty = Number(lot.availableKg) + delta;
		if (nextQty < 0) {
			throw new HttpError(409, `Insufficient stock in lot ${lot.label}`);
		}

		const updatedLot = await tx.lot.update({
			where: { id: lot.id },
			data: {
				availableKg: new Prisma.Decimal(nextQty)
			}
		});

		const move = await tx.stockMove.create({
			data: {
				moveNo: moveNo(),
				lotId: lot.id,
				warehouseId: lot.warehouseId,
				qtyKg: new Prisma.Decimal(delta),
				reason: 'ADJUSTMENT',
				refType: 'ADJ',
				refId: adjustmentRef(),
				memo: input.reason,
				lotLabel: lot.label
			}
		});

		return {
			lot: updatedLot,
			move
		};
	});
}

export async function transferStock(input: TransferStockInput) {
	return prisma.$transaction(async (tx) => {
		const sourceLot = await tx.lot.findUnique({ where: { id: input.lotId } });
		if (!sourceLot) throw new HttpError(404, 'Source lot not found');

		if (sourceLot.warehouseId === input.toWarehouseId) {
			throw new HttpError(400, 'Source and destination warehouse must be different');
		}

		const toWarehouse = await tx.warehouse.findUnique({ where: { id: input.toWarehouseId } });
		if (!toWarehouse) throw new HttpError(404, 'Destination warehouse not found');

		if (Number(sourceLot.availableKg) < input.qtyKg) {
			throw new HttpError(409, `Insufficient stock in lot ${sourceLot.label}`);
		}

		const nextSourceQty = Number(sourceLot.availableKg) - input.qtyKg;
		const updatedSourceLot = await tx.lot.update({
			where: { id: sourceLot.id },
			data: {
				availableKg: new Prisma.Decimal(nextSourceQty)
			}
		});

		let destinationLot = await tx.lot.findFirst({
			where: {
				productId: sourceLot.productId,
				warehouseId: input.toWarehouseId
			},
			orderBy: { createdAt: 'desc' }
		});

		if (!destinationLot) {
			destinationLot = await tx.lot.create({
				data: {
					lotNo: transferLotNo(),
					label: transferLotLabel(sourceLot.productId, input.toWarehouseId),
					productId: sourceLot.productId,
					warehouseId: input.toWarehouseId,
					availableKg: new Prisma.Decimal(0),
					avgCostPerKg: sourceLot.avgCostPerKg,
					sourcePoId: sourceLot.sourcePoId,
					sourcePoItemId: sourceLot.sourcePoItemId
				}
			});
		}

		const dstCurrentQty = Number(destinationLot.availableKg);
		const srcAvg = Number(sourceLot.avgCostPerKg);
		const dstAvg = Number(destinationLot.avgCostPerKg);
		const dstNextQty = dstCurrentQty + input.qtyKg;
		const dstNextAvg =
			dstNextQty > 0
				? (dstCurrentQty * dstAvg + input.qtyKg * srcAvg) / dstNextQty
				: dstAvg;

		const updatedDestinationLot = await tx.lot.update({
			where: { id: destinationLot.id },
			data: {
				availableKg: new Prisma.Decimal(dstNextQty),
				avgCostPerKg: new Prisma.Decimal(dstNextAvg)
			}
		});

		const refId = transferRef();

		const outMove = await tx.stockMove.create({
			data: {
				moveNo: moveNo(),
				lotId: sourceLot.id,
				warehouseId: sourceLot.warehouseId,
				qtyKg: new Prisma.Decimal(-input.qtyKg),
				reason: 'TRANSFER',
				refType: 'TRF',
				refId,
				memo: input.memo,
				lotLabel: sourceLot.label
			}
		});

		const inMove = await tx.stockMove.create({
			data: {
				moveNo: moveNo(),
				lotId: updatedDestinationLot.id,
				warehouseId: input.toWarehouseId,
				qtyKg: new Prisma.Decimal(input.qtyKg),
				reason: 'TRANSFER',
				refType: 'TRF',
				refId,
				memo: input.memo,
				lotLabel: updatedDestinationLot.label
			}
		});

		return {
			sourceLot: updatedSourceLot,
			destinationLot: updatedDestinationLot,
			moves: [outMove, inMove]
		};
	});
}

function dateStart(dateText: string) {
	return new Date(`${dateText}T00:00:00.000Z`);
}

function dateEnd(dateText: string) {
	return new Date(`${dateText}T23:59:59.999Z`);
}

function toNumber(v: unknown) {
	return Number(v || 0);
}

export async function getInventoryDashboard(query: InventoryDashboardQuery) {
	const page = Math.max(1, query.page || 1);
	const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
	const skip = (page - 1) * pageSize;

	const where: Prisma.LotWhereInput = {
		AND: [
			query.availableOnly ? { availableKg: { gt: new Prisma.Decimal(0) } } : {},
			query.warehouseId ? { warehouseId: query.warehouseId } : {},
			query.productId ? { productId: query.productId } : {},
			query.q
				? {
					OR: [
						{ label: { contains: query.q, mode: 'insensitive' } },
						{ product: { name: { contains: query.q, mode: 'insensitive' } } },
						{ warehouse: { name: { contains: query.q, mode: 'insensitive' } } }
					]
				}
				: {}
		]
	};

	const sortBy = query.sortBy || 'createdAt';
	const sortDir = query.sortDir || 'desc';

	const [total, pageLots, aggregate, valueRows, grouped] = await Promise.all([
		prisma.lot.count({ where }),
		prisma.lot.findMany({
			where,
			skip,
			take: pageSize,
			orderBy: { [sortBy]: sortDir },
			include: {
				product: { select: { id: true, name: true } },
				warehouse: { select: { id: true, name: true } }
			}
		}),
		prisma.lot.aggregate({
			where,
			_count: { _all: true },
			_sum: { availableKg: true }
		}),
		prisma.lot.findMany({
			where,
			select: { availableKg: true, avgCostPerKg: true }
		}),
		prisma.lot.groupBy({
			by: ['productId'],
			where,
			_sum: { availableKg: true },
			_count: { _all: true },
			orderBy: { _sum: { availableKg: 'desc' } },
			take: 20
		})
	]);

	const totalQtyKg = toNumber(aggregate._sum.availableKg);
	const totalValue = valueRows.reduce(
		(sum, row) => sum + toNumber(row.availableKg) * toNumber(row.avgCostPerKg),
		0
	);

	const productIds = grouped.map((g) => g.productId);
	const productRows = productIds.length
		? await prisma.product.findMany({
				where: { id: { in: productIds } },
				select: { id: true, name: true }
		  })
		: [];
	const productNameById = Object.fromEntries(productRows.map((p) => [p.id, p.name]));

	return {
		summary: {
			totalLots: aggregate._count._all,
			totalQtyKg,
			totalValue
		},
		breakdownByProduct: grouped.map((g) => ({
			productId: g.productId,
			productName: productNameById[g.productId] || g.productId,
			lotCount: g._count._all,
			qtyKg: toNumber(g._sum.availableKg)
		})),
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize)
		},
		items: pageLots.map((lot) => ({
			id: lot.id,
			lotNo: lot.lotNo,
			label: lot.label,
			productId: lot.productId,
			productName: lot.product?.name || '',
			warehouseId: lot.warehouseId,
			warehouseName: lot.warehouse?.name || '',
			availableKg: toNumber(lot.availableKg),
			avgCostPerKg: toNumber(lot.avgCostPerKg),
			value: toNumber(lot.availableKg) * toNumber(lot.avgCostPerKg),
			createdAt: lot.createdAt,
			updatedAt: lot.updatedAt
		}))
	};
}

export async function getStockCard(query: StockCardQuery) {
	const page = Math.max(1, query.page || 1);
	const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
	const skip = (page - 1) * pageSize;

	const fromDate = query.from ? dateStart(query.from) : undefined;
	const toDate = query.to ? dateEnd(query.to) : undefined;

	const baseWhere: Prisma.StockMoveWhereInput = {
		AND: [
			query.lotId ? { lotId: query.lotId } : {},
			query.warehouseId ? { warehouseId: query.warehouseId } : {}
		]
	};

	const inRangeWhere: Prisma.StockMoveWhereInput = {
		AND: [
			baseWhere,
			fromDate ? { createdAt: { gte: fromDate } } : {},
			toDate ? { createdAt: { lte: toDate } } : {}
		]
	};

	const openingWhere: Prisma.StockMoveWhereInput = fromDate
		? {
				AND: [baseWhere, { createdAt: { lt: fromDate } }]
		  }
		: { AND: [baseWhere] };

	const [total, rows, openingAgg, inAgg] = await Promise.all([
		prisma.stockMove.count({ where: inRangeWhere }),
		prisma.stockMove.findMany({
			where: inRangeWhere,
			skip,
			take: pageSize,
			orderBy: [{ createdAt: query.sortDir || 'asc' }, { id: query.sortDir || 'asc' }],
			include: {
				warehouse: { select: { id: true, name: true } },
				lot: { select: { id: true, label: true, productId: true } }
			}
		}),
		prisma.stockMove.aggregate({ where: openingWhere, _sum: { qtyKg: true } }),
		prisma.stockMove.aggregate({ where: inRangeWhere, _sum: { qtyKg: true } })
	]);

	const inSummary = await prisma.stockMove.groupBy({
		by: ['reason'],
		where: inRangeWhere,
		_sum: { qtyKg: true }
	});

	const totalInKg = inSummary
		.filter((x) => toNumber(x._sum.qtyKg) > 0)
		.reduce((s, x) => s + toNumber(x._sum.qtyKg), 0);

	const totalOutKg = inSummary
		.filter((x) => toNumber(x._sum.qtyKg) < 0)
		.reduce((s, x) => s + Math.abs(toNumber(x._sum.qtyKg)), 0);

	const openingQtyKg = toNumber(openingAgg._sum.qtyKg);
	const netMovementKg = toNumber(inAgg._sum.qtyKg);
	const closingQtyKg = openingQtyKg + netMovementKg;

	return {
		filters: {
			lotId: query.lotId || null,
			warehouseId: query.warehouseId || null,
			from: query.from || null,
			to: query.to || null,
			sortDir: query.sortDir || 'asc'
		},
		summary: {
			openingQtyKg,
			totalInKg,
			totalOutKg,
			netMovementKg,
			closingQtyKg
		},
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize)
		},
		items: rows.map((m) => ({
			id: m.id,
			moveNo: m.moveNo,
			createdAt: m.createdAt,
			reason: m.reason,
			refType: m.refType,
			refId: m.refId,
			memo: m.memo,
			qtyKg: toNumber(m.qtyKg),
			lotId: m.lotId,
			lotLabel: m.lotLabel || m.lot?.label || '',
			warehouseId: m.warehouseId,
			warehouseName: m.warehouse?.name || ''
		}))
	};
}
