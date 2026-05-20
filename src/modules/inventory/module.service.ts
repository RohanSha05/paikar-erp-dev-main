import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { nextDailySequenceIdForDelegate } from '../../common/utils/sequence-id';
import { dhakaDayEnd, dhakaDayStart } from '../../common/utils/date';
import { getRemainingBagCount, syncLotMetaBagBalance } from '../../common/utils/lot-balance';
import {
	AdjustStockInput,
	TransferStockInput,
	InventoryDashboardQuery,
	StockCardQuery,
	InventoryReportQuery
} from './module.types';

async function moveNo(tx: Prisma.TransactionClient) {
	return nextDailySequenceIdForDelegate(tx.stockMove, 'moveNo', 'MV');
}

async function transferRef(tx: Prisma.TransactionClient) {
	return nextDailySequenceIdForDelegate(tx.stockMove, 'refId', 'TRF');
}

async function adjustmentRef(tx: Prisma.TransactionClient) {
	return nextDailySequenceIdForDelegate(tx.stockMove, 'refId', 'ADJ');
}

async function transferLotNo(tx: Prisma.TransactionClient) {
	return nextDailySequenceIdForDelegate(tx.lot, 'lotNo', 'LOT-TRF');
}

function transferLotLabel(lotNoValue: string, productId: string, warehouseId: string) {
	return `${lotNoValue}-${productId.slice(0, 8)}-${warehouseId.slice(0, 8)}`;
}

async function ensureSystemAccountByCode(
	tx: Prisma.TransactionClient,
	code: string,
	name: string,
	type: 'asset' | 'expense' | 'liability' = 'asset',
) {
	return tx.account.upsert({
		where: { code },
		update: {},
		create: {
			code,
			name,
			type,
			opening: new Prisma.Decimal(0),
			active: true,
		},
	});
}

async function generateVoucherNo(tx: Prisma.TransactionClient, vdate: Date) {
	return nextDailySequenceIdForDelegate(tx.voucher, 'voucherNo', 'VCH', vdate);
}

async function createInventoryVoucher(
	tx: Prisma.TransactionClient,
	input: {
		vdate: Date;
		narration: string;
		rows: Array<{ accountId: string; dr: number; cr: number; memo?: string }>;
	},
) {
	const voucherNo = await generateVoucherNo(tx, input.vdate);
	const voucher = await tx.voucher.create({
		data: {
			voucherNo,
			vtype: 'journal',
			vdate: input.vdate,
			narration: input.narration,
			status: 'POSTED'
		},
	});

	await tx.voucherRow.createMany({
		data: input.rows.map((row) => ({
			voucherId: voucher.id,
			accountId: row.accountId,
			dr: new Prisma.Decimal(row.dr || 0),
			cr: new Prisma.Decimal(row.cr || 0),
			memo: row.memo,
		})),
	});

	return voucher;
}

function inventoryPurchaseRatePerKg(
	rateBasis: string,
	rateValue: number,
	bagCount = 0,
	stockKg = 0,
) {
	if (rateBasis === 'perKg') return rateValue;
	if (rateBasis === 'perMon') return rateValue / 40;
	return stockKg > 0 ? (bagCount * rateValue) / stockKg : 0;
}

function computeInventoryPurchaseTotals(order: any) {
	const items = Array.isArray(order?.items) ? order.items : [];
	const bagCostMode = order?.bagCostMode || 'paid';
	const bagCostPerBag = Number(order?.bagCostPerBag || 0);
	const transport = Number(order?.transport || 0);
	const loadingUnloading = Number((order?.loadingUnloading ?? order?.loading) || 0);
	const misc = Number(order?.misc || 0);
	const headerExtraCosts = transport + loadingUnloading + misc;

	let totalBags = 0;
	let basePurchase = 0;
	let totalStockKg = 0;

	const rawLines: Array<{
		bags: number;
		stockKg: number;
		baseCost: number;
		rateBasis: string;
		rateValue: number;
	}> = items.map((item: any) => {
		const bags = Number(item?.bagCount || 0);
		const actualKg = bags * Number(item?.actualKgPerBag || 0);
		const accountingKg = bags * Number(item?.accountingKgPerBag || 0);
		const stockKg = item?.weightPolicy === 'actual' ? actualKg : accountingKg;
		const rateBasis = String(item?.rateBasis || 'perMon');
		const rateValue = Number(item?.rateValue || 0);
		const baseCost = rateBasis === 'perBag'
			? bags * rateValue
			: stockKg * inventoryPurchaseRatePerKg(rateBasis, rateValue);

		totalBags += bags;
		totalStockKg += stockKg;
		basePurchase += baseCost;

		return {
			bags,
			stockKg,
			baseCost,
			rateBasis,
			rateValue,
		};
	});

	const bagCostTotal = bagCostMode === 'self' ? 0 : totalBags * bagCostPerBag;
	const productSummaries = rawLines.map((line) => {
		const bagCost = bagCostMode === 'self' ? 0 : totalBags > 0 ? (line.bags / totalBags) * bagCostTotal : 0;
		const headerCostShare = totalStockKg > 0 ? headerExtraCosts * (line.stockKg / totalStockKg) : 0;
		const lineCost = line.baseCost + bagCost + headerCostShare;
		const avgPerKg = line.stockKg > 0 ? lineCost / line.stockKg : 0;

		return {
			...line,
			bagCost,
			headerCostShare,
			lineCost,
			avgPerKg,
			avgPerMon: avgPerKg * 40,
		};
	});

	return { productSummaries };
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
				availableKg: new Prisma.Decimal(nextQty),
				meta: syncLotMetaBagBalance((lot as any).meta, nextQty)
			}
		});

		const move = await tx.stockMove.create({
			data: {
				moveNo: await moveNo(tx),
				lotId: lot.id,
				warehouseId: lot.warehouseId,
				qtyKg: new Prisma.Decimal(delta),
				reason: 'ADJUSTMENT',
				refType: 'ADJ',
				refId: await adjustmentRef(tx),
				memo: input.reason,
				lotLabel: lot.label
			}
		});

		const absQty = Math.abs(delta);
		const adjustmentValue = absQty * Number(lot.avgCostPerKg || 0);
		let voucher: { id: string; voucherNo: string } | null = null;

		if (adjustmentValue > 0) {
			const inventoryAccount = await ensureSystemAccountByCode(tx, 'AC-INVENTORY', 'Inventory', 'asset');
			const adjustmentAccount = await ensureSystemAccountByCode(
				tx,
				'AC-INVENTORY-ADJ',
				'Inventory Adjustment',
				'expense',
			);

			const rows =
				input.mode === 'add'
					? [
						{ accountId: inventoryAccount.id, dr: adjustmentValue, cr: 0, memo: input.reason || 'Stock adjustment increase' },
						{ accountId: adjustmentAccount.id, dr: 0, cr: adjustmentValue, memo: input.reason || 'Stock adjustment offset' },
					]
					: [
						{ accountId: adjustmentAccount.id, dr: adjustmentValue, cr: 0, memo: input.reason || 'Stock adjustment expense' },
						{ accountId: inventoryAccount.id, dr: 0, cr: adjustmentValue, memo: input.reason || 'Stock adjustment decrease' },
					];

			const voucherDate = new Date();
			voucher = await createInventoryVoucher(tx, {
				vdate: voucherDate,
				narration: `Inventory adjustment ${input.mode} - ${lot.label}`,
				rows,
			});
		}

		return {
			lot: updatedLot,
			move,
			voucher
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
				availableKg: new Prisma.Decimal(nextSourceQty),
				meta: syncLotMetaBagBalance((sourceLot as any).meta, nextSourceQty)
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
			const nextLotNo = await transferLotNo(tx);
			destinationLot = await tx.lot.create({
				data: {
					lotNo: nextLotNo,
					label: transferLotLabel(nextLotNo, sourceLot.productId, input.toWarehouseId),
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
				avgCostPerKg: new Prisma.Decimal(dstNextAvg),
				meta: syncLotMetaBagBalance((destinationLot as any).meta, dstNextQty, (destinationLot as any)?.meta?.kgPerBag, (destinationLot as any)?.meta?.initialBagCount)
			}
		});

		const refId = await transferRef(tx);

		const outMove = await tx.stockMove.create({
			data: {
				moveNo: await moveNo(tx),
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
				moveNo: await moveNo(tx),
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

		const transferValue = input.qtyKg * Number(sourceLot.avgCostPerKg || 0);
		let voucher: { id: string; voucherNo: string } | null = null;

		if (transferValue > 0) {
			const inventoryAccount = await ensureSystemAccountByCode(tx, 'AC-INVENTORY', 'Inventory', 'asset');
			const transferClearingAccount = await ensureSystemAccountByCode(
				tx,
				'AC-INVENTORY-TRF',
				'Inventory Transfer Clearing',
				'asset',
			);

			const voucherDate = new Date();
			voucher = await createInventoryVoucher(tx, {
				vdate: voucherDate,
				narration: `Inventory transfer ${sourceLot.label} -> ${updatedDestinationLot.label}`,
				rows: [
					{
						accountId: inventoryAccount.id,
						dr: transferValue,
						cr: 0,
						memo: input.memo || `Transfer in to ${toWarehouse.name}`,
					},
					{
						accountId: transferClearingAccount.id,
						dr: 0,
						cr: transferValue,
						memo: input.memo || `Transfer out from source warehouse`,
					},
				],
			});
		}

		return {
			sourceLot: updatedSourceLot,
			destinationLot: updatedDestinationLot,
			moves: [outMove, inMove],
			voucher
		};
	});
}

function dateStart(dateText: string) {
	return dhakaDayStart(dateText);
}

function dateEnd(dateText: string) {
	return dhakaDayEnd(dateText);
}

function toNumber(v: unknown) {
	return Number(v || 0);
}

const KG_PER_MON = 40;

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
	const sortDir = query.sortDir || 'asc';

	const [total, pageLots, aggregate, valueRows, grouped] = await Promise.all([
		prisma.lot.count({ where }),
		prisma.lot.findMany({
			where,
			skip,
			take: pageSize,
			orderBy: { [sortBy]: sortDir },
			select: {
				id: true,
				lotNo: true,
				label: true,
				productId: true,
				warehouseId: true,
				availableKg: true,
				avgCostPerKg: true,
				meta: true,
				createdAt: true,
				updatedAt: true,
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
			kgPerBag: toNumber((lot.meta as any)?.kgPerBag),
			bagCount: toNumber((lot.meta as any)?.bagCount),
			remainingBagCount: getRemainingBagCount(lot.availableKg, lot.meta as any),
			initialBagCount: toNumber((lot.meta as any)?.initialBagCount),
			value: toNumber(lot.availableKg) * toNumber(lot.avgCostPerKg),
			createdAt: lot.createdAt,
			updatedAt: lot.updatedAt
		}))
	};
}

export async function getInventoryReport(query: InventoryReportQuery) {
	const page = Math.max(1, query.page || 1);
	const pageSize = Math.min(200, Math.max(1, query.pageSize || 100));
	const skip = (page - 1) * pageSize;

	const fromDate = query.from ? dateStart(query.from) : undefined;
	const toDate = query.to ? dateEnd(query.to) : undefined;
	const transactionType = query.transactionType || 'all';
	const purchaseTypeSelected = transactionType === 'purchase' || transactionType === 'all';
	const saleTypeSelected = transactionType === 'sale' || transactionType === 'all';

	const purchaseOrderWhere: Prisma.PurchaseOrderWhereInput = {
		AND: [
			query.partyId && purchaseTypeSelected ? { sellerId: query.partyId } : {},
			query.q
				? {
					OR: [
						{ poNo: { contains: query.q, mode: 'insensitive' } },
						{ seller: { name: { contains: query.q, mode: 'insensitive' } } },
					]
				}
				: {}
		]
	};

	const salesOrderWhere: Prisma.SalesOrderWhereInput = {
		AND: [
			query.partyId && saleTypeSelected ? { customerId: query.partyId } : {},
			query.q
				? {
					OR: [
						{ soNo: { contains: query.q, mode: 'insensitive' } },
						{ customer: { name: { contains: query.q, mode: 'insensitive' } } },
					]
				}
				: {}
		]
	};

	const [purchaseOrderIds, salesOrderIds] = await Promise.all([
		purchaseTypeSelected
			? prisma.purchaseOrder.findMany({ where: purchaseOrderWhere, select: { id: true } })
			: Promise.resolve([] as Array<{ id: string }>),
		saleTypeSelected
			? prisma.salesOrder.findMany({ where: salesOrderWhere, select: { id: true } })
			: Promise.resolve([] as Array<{ id: string }>)
	]);

	const purchaseIds = purchaseOrderIds.map((row) => row.id);
	const salesIds = salesOrderIds.map((row) => row.id);

	const [purchaseOrders, salesOrdersWithItems] = await Promise.all([
		purchaseIds.length
			? prisma.purchaseOrder.findMany({
				where: { id: { in: purchaseIds } },
				select: {
					id: true,
					poNo: true,
					seller: { select: { id: true, name: true } },
					sellerSnapshot: true,
					items: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							bagCount: true,
							productId: true,
							productName: true,
							actualKgPerBag: true,
							accountingKgPerBag: true,
							weightPolicy: true,
							rateBasis: true,
							rateValue: true,
						},
					},
				}
			})
			: Promise.resolve([] as Array<{ id: string; poNo: string; seller: { id: string; name: string }; sellerSnapshot: unknown; items: Array<{ id: string; bagCount: number; productId: string; productName: string | null; actualKgPerBag: number; accountingKgPerBag: number; weightPolicy: string; rateBasis: string; rateValue: number }> }>),
		salesIds.length
			? prisma.salesOrder.findMany({
				where: { id: { in: salesIds } },
				select: {
					id: true,
					soNo: true,
					customer: { select: { id: true, name: true } },
					customerSnapshot: true,
					itemsSnapshot: true,
					items: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							lotId: true,
							bagCount: true,
							productId: true,
							productType: true,
						},
					},
				}
			})
			: Promise.resolve([] as Array<{ id: string; soNo: string; customer: { id: string; name: string }; customerSnapshot: unknown; items: Array<{ id: string; lotId: string; bagCount: number; productId: string | null; productType: string }> }>)
	]);

	const purchaseOrderById = new Map(purchaseOrders.map((order) => [order.id, order]));
	const salesOrderById = new Map(salesOrdersWithItems.map((order) => [order.id, order]));
	const purchaseCostBreakdownById = new Map(
		purchaseOrders.map((order) => [order.id, computeInventoryPurchaseTotals(order)]),
	);

	const refFilter: Prisma.StockMoveWhereInput | undefined =
		transactionType === 'purchase'
			? { refType: 'PO', refId: { in: purchaseIds.length ? purchaseIds : ['__none__'] } }
			: transactionType === 'sale'
				? { refType: 'SO', refId: { in: salesIds.length ? salesIds : ['__none__'] } }
				: {
					OR: [
						{ refType: 'PO', refId: { in: purchaseIds.length ? purchaseIds : ['__none__'] } },
						{ refType: 'SO', refId: { in: salesIds.length ? salesIds : ['__none__'] } }
					]
				};

	const baseWhere: Prisma.StockMoveWhereInput = {
		AND: [
			{ reason: { in: ['PURCHASE', 'SALE'] } },
			query.warehouseId ? { warehouseId: query.warehouseId } : {},
			query.productId ? { lot: { productId: query.productId } } : {},
			query.productCategory ? { lot: { product: { category: { equals: query.productCategory, mode: 'insensitive' } } } } : {},
			query.q
				? {
					OR: [
						{ lotLabel: { contains: query.q, mode: 'insensitive' } },
						{ lot: { product: { name: { contains: query.q, mode: 'insensitive' } } } },
						{ warehouse: { name: { contains: query.q, mode: 'insensitive' } } }
					]
				}
				: {},
			refFilter ?? {}
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
		? { AND: [baseWhere, { createdAt: { lt: fromDate } }] }
		: { AND: [baseWhere] };

	const [total, rows, openingRows, periodRows] = await Promise.all([
		prisma.stockMove.count({ where: inRangeWhere }),
		prisma.stockMove.findMany({
			where: inRangeWhere,
			skip,
			take: pageSize,
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			include: {
				warehouse: { select: { id: true, name: true } },
				lot: {
					include: {
						product: { select: { id: true, name: true } },
						sourcePo: { include: { seller: { select: { id: true, name: true } } } }
					}
				}
			}
		}),
		prisma.stockMove.findMany({
			where: openingWhere,
			select: { qtyKg: true, lotId: true, refType: true, refId: true, lot: { select: { avgCostPerKg: true } } }
		}),
		prisma.stockMove.findMany({
			where: inRangeWhere,
			select: { qtyKg: true, lotId: true, refType: true, refId: true, lot: { select: { avgCostPerKg: true } } }
		})
	]);

	const purchaseRows = periodRows.filter((row) => row.refType === 'PO');
	const saleRows = periodRows.filter((row) => row.refType === 'SO');

	const openingQtyKg = openingRows.reduce((sum, row) => sum + toNumber(row.qtyKg), 0);
	const openingAmount = openingRows.reduce((sum, row) => {
		const qty = toNumber(row.qtyKg);
		const unitCost = toNumber(row.lot?.avgCostPerKg);
		const amount = Math.abs(qty) * unitCost;
		return sum + (qty >= 0 ? amount : -amount);
	}, 0);

	const periodTotals = periodRows.reduce(
		(acc, row) => {
			const qty = toNumber(row.qtyKg);
			const unitCost = toNumber(row.lot?.avgCostPerKg);
			const amount = Math.abs(qty) * unitCost;
			if (qty >= 0) {
				acc.totalDrKg += qty;
				acc.totalDrAmount += amount;
			} else {
				acc.totalCrKg += Math.abs(qty);
				acc.totalCrAmount += amount;
			}
			return acc;
		},
		{ totalDrKg: 0, totalCrKg: 0, totalDrAmount: 0, totalCrAmount: 0 }
	);

	const totalInKg = periodTotals.totalDrKg;
	const totalOutKg = periodTotals.totalCrKg;
	const closingQtyKg = openingQtyKg + totalInKg - totalOutKg;
	const closingAmount = openingAmount + periodTotals.totalDrAmount - periodTotals.totalCrAmount;

	// (closing bag/mon will be computed from opening + purchased - sold below)

	const rowSequenceByRef = new Map<string, number>();
	const items = rows.map((m) => {
		const qtyKg = Math.abs(toNumber(m.qtyKg));
		const mon = qtyKg / 40;
		const isPurchase = m.refType === 'PO';
		const refKey = `${m.refType}:${m.refId}`;
		const rowIndex = rowSequenceByRef.get(refKey) || 0;
		rowSequenceByRef.set(refKey, rowIndex + 1);
		const sourceOrder = isPurchase ? purchaseOrderById.get(m.refId) : salesOrderById.get(m.refId);
		const sourceItems = sourceOrder?.items || [];
		const sourceIndex = Math.max(0, sourceItems.length - 1 - rowIndex);
		const sourceItem = sourceItems[sourceIndex];
		const purchaseSummaries = isPurchase
			? (purchaseCostBreakdownById.get(m.refId)?.productSummaries || [])
			: [];
		const saleSnapshots = !isPurchase
			? ((sourceOrder as { itemsSnapshot?: Array<{ lineBase?: number }> } | undefined)?.itemsSnapshot || [])
			: [];
		const sellerName =
			purchaseOrderById.get(m.refId)?.seller?.name ||
			((purchaseOrderById.get(m.refId)?.sellerSnapshot as { name?: string } | null | undefined)?.name ?? '') ||
			m.lot?.sourcePo?.seller?.name ||
			'';
		const customerName =
			salesOrderById.get(m.refId)?.customer?.name ||
			((salesOrderById.get(m.refId)?.customerSnapshot as { name?: string } | null | undefined)?.name ?? '') ||
			'';
		const bagCount = Number(sourceItem?.bagCount || 0);
		const unitCost = isPurchase
			? (() => {
				const lineCost = Number(purchaseSummaries[sourceIndex]?.lineCost || 0);
				return qtyKg > 0 && lineCost > 0 ? lineCost / qtyKg : toNumber(m.lot?.avgCostPerKg);
			})()
			: (() => {
				const lineBase = Number(saleSnapshots[sourceIndex]?.lineBase || (sourceItem as { lineBase?: unknown } | undefined)?.lineBase || 0);
				return qtyKg > 0 && lineBase > 0 ? lineBase / qtyKg : toNumber(m.lot?.avgCostPerKg);
			})();
		const totalPrice = isPurchase
			? Number(purchaseSummaries[sourceIndex]?.lineCost || qtyKg * unitCost)
			: Number(saleSnapshots[sourceIndex]?.lineBase || (sourceItem as { lineBase?: unknown } | undefined)?.lineBase || qtyKg * unitCost);
		const productName = isPurchase
			? String((sourceItem as { productName?: string | null } | undefined)?.productName || m.lot?.product?.name || '')
			: String((sourceItem as { productType?: string } | undefined)?.productType || m.lot?.product?.name || '');

		return {
			id: m.id,
			createdAt: m.createdAt,
			transactionType: isPurchase ? 'purchase' : 'sale',
			partyName: isPurchase ? sellerName : customerName,
			poNo: purchaseOrderById.get(m.refId)?.poNo,
			soNo: salesOrderById.get(m.refId)?.soNo,
			sellerId: purchaseOrderById.get(m.refId)?.seller?.id,
			sellerName,
			customerId: salesOrderById.get(m.refId)?.customer?.id,
			customerName,
			lotId: m.lotId,
			lotLabel: m.lotLabel || m.lot?.label || '',
			productId: String(sourceItem?.productId || m.lot?.productId || ''),
			productName,
			warehouseId: m.warehouseId,
			warehouseName: m.warehouse?.name || '',
			qtyKg,
			bagCount,
			mon,
			unitCost,
			totalPrice,
			drKg: isPurchase ? qtyKg : 0,
			crKg: isPurchase ? 0 : qtyKg,
			drAmount: isPurchase ? totalPrice : 0,
			crAmount: isPurchase ? 0 : totalPrice,
			reason: m.reason,
			refType: m.refType,
			refId: m.refId,
			memo: m.memo
		};
	});

	// Compute bag/mon/price totals from mapped items for period
	let periodPurchasedBags = 0;
	let periodSoldBags = 0;
	let periodPurchasedPrice = 0;
	let periodSoldPrice = 0;
	for (const it of items) {
		// Only count explicit bag counts from PO/SO items. Do NOT derive fractional bags from kg.
		const bags = Number(it.bagCount || 0);
		if (it.transactionType === 'purchase') {
			periodPurchasedBags += bags;
			periodPurchasedPrice += Number(it.drAmount || 0);
		} else {
			periodSoldBags += bags;
			periodSoldPrice += Number(it.crAmount || 0);
		}
	}

	const netQtyKg = totalInKg - totalOutKg;
	const netAmount = periodTotals.totalDrAmount - periodTotals.totalCrAmount;
	const netBagCount = Math.round(periodPurchasedBags) - Math.round(periodSoldBags);
	const netMon = netQtyKg / 40;

	return {
		summary: {
			openingQtyKg,
			openingAmount,
			totalDrKg: periodTotals.totalDrKg,
			totalCrKg: periodTotals.totalCrKg,
			totalDrAmount: periodTotals.totalDrAmount,
			totalCrAmount: periodTotals.totalCrAmount,
			totalInKg,
			totalOutKg,
			closingAmount: netAmount,
			closingQtyKg: netQtyKg,
			totalPurchasedBags: Math.round(periodPurchasedBags),
			totalSoldBags: Math.round(periodSoldBags),
			closingBagCount: netBagCount,
			closingMon: netMon,
			purchasedPrice: periodPurchasedPrice,
			soldPrice: periodSoldPrice,
			closingPriceByFlow: netAmount,
			totalLots: new Set(periodRows.map((row) => row.lotId)).size,
			purchaseCount: purchaseRows.length,
			saleCount: saleRows.length
		},
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize)
		},
		items
	};
}

// Reconcile lot availableKg using stock moves sum
export async function reconcileAllLots() {
	return prisma.$transaction(async (tx) => {
		// get all lot ids
		const lots = await tx.lot.findMany({ select: { id: true, availableKg: true, label: true } });
		const results: Array<{ lotId: string; label?: string; old: number; computed: number; changed: boolean }> = [];

		for (const l of lots) {
			const sumRow: any = await tx.stockMove.aggregate({
				where: { lotId: l.id },
				_sum: { qtyKg: true }
			});
			const computed = Number(sumRow._sum?.qtyKg || 0);
			const old = Number(l.availableKg || 0);
			const changed = Math.abs(old - computed) > 0.00001;
			if (changed) {
				const current = await tx.lot.findUnique({ where: { id: l.id }, select: { meta: true } });
				await tx.lot.update({
					where: { id: l.id },
					data: {
						availableKg: new Prisma.Decimal(computed),
						meta: syncLotMetaBagBalance(current?.meta as any, computed)
					}
				});
			}
			results.push({ lotId: l.id, label: l.label, old, computed, changed });
		}

		return { summary: { totalLots: results.length, changed: results.filter(r => r.changed).length }, details: results };
	});
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
