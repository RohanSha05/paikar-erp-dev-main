import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../common/httpError';
import { AdjustStockInput, TransferStockInput } from './module.types';

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
