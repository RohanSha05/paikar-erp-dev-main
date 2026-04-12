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
