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

export type InventoryReportQuery = {
	from?: string;
	to?: string;
	transactionType?: 'all' | 'purchase' | 'sale';
	partyId?: string;
	warehouseId?: string;
	productId?: string;
	productCategory?: string;
	q?: string;
	page: number;
	pageSize: number;
};

export type InventoryReportRow = {
	id: string;
	createdAt: string;
	transactionType: 'purchase' | 'sale';
	partyName?: string;
	poNo?: string;
	soNo?: string;
	sellerId?: string;
	sellerName?: string;
	customerId?: string;
	customerName?: string;
	lotId: string;
	lotLabel?: string;
	productId?: string;
	productName?: string;
	warehouseId?: string;
	warehouseName?: string;
	qtyKg: number;
	bagCount: number;
	mon: number;
	unitCost: number;
	totalPrice: number;
	drKg: number;
	crKg: number;
	drAmount: number;
	crAmount: number;
	reason: string;
	refType?: string;
	refId?: string;
	memo?: string;
};

export type InventoryReportResult = {
	summary: {
		openingQtyKg: number;
		openingAmount: number;
		totalDrKg: number;
		totalCrKg: number;
		totalDrAmount: number;
		totalCrAmount: number;
		totalInKg: number;
		totalOutKg: number;
		closingAmount: number;
		closingQtyKg: number;
		totalLots: number;
		purchaseCount: number;
		saleCount: number;
	};
	items: InventoryReportRow[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	};
};
