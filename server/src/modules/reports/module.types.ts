export interface ExpenseMonthSummaryDto {
	month: number;
	fixed: number;
	variable: number;
	total: number;
}

export interface PurchaseOrderLotRemainingDto {
	id: string;
	lotNo: string;
	label: string;
	warehouseId: string;
	warehouseName?: string;
	productId: string;
	productName?: string;
	productType?: string;
	remainingKg: number;
}

export interface PurchaseOrderRemainingStockDto {
	totalKg: number;
	totalMon: number;
	lots: PurchaseOrderLotRemainingDto[];
	byWarehouse: Array<{ warehouse: string; kg: number }>;
	byProduct: Array<{ productType: string; kg: number }>;
	poId?: string;
	isFullySold?: boolean;
	remainingTotalKg?: number;
	items?: Array<{
		poItemId: string;
		productType: string;
		initialKg: number;
		remainingKg: number;
		isSoldOut: boolean;
		lots: Array<{
			id: string;
			label: string;
			warehouseId: string;
			warehouseName?: string;
			remainingKg: number;
		}>;
	}>;
}

export interface PurchaseOrderSoldPercentDto {
	initialKg: number;
	soldKg: number;
	remainingKg: number;
	soldPct: number;
	isFullySold: boolean;
	poId?: string;
}

export interface PurchaseOrderFulfillmentDto {
	poId: string;
	isFullySold: boolean;
	remainingTotalKg: number;
	items: Array<{
		poItemId: string;
		productType: string;
		initialKg: number;
		remainingKg: number;
		isSoldOut: boolean;
		lots: Array<{
			id: string;
			label: string;
			warehouseId: string;
			warehouseName?: string;
			remainingKg: number;
		}>;
	}>;
}
