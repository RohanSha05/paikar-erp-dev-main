export type AdjustStockInput = {
	lotId: string;
	mode: 'add' | 'remove';
	qtyKg: number;
	reason?: string;
};

export type TransferStockInput = {
	lotId: string;
	toWarehouseId: string;
	qtyKg: number;
	memo?: string;
};

export type InventoryDashboardQuery = {
	q?: string;
	warehouseId?: string;
	productId?: string;
	availableOnly?: boolean;
	page: number;
	pageSize: number;
	sortBy: 'createdAt' | 'availableKg' | 'avgCostPerKg';
	sortDir: 'asc' | 'desc';
};

export type StockCardQuery = {
	lotId?: string;
	warehouseId?: string;
	from?: string;
	to?: string;
	page: number;
	pageSize: number;
	sortDir: 'asc' | 'desc';
};
