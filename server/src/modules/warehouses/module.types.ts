export type CreateWarehouseInput = {
	code: string;
	name: string;
	address?: string;
};

export type UpdateWarehouseInput = {
	name?: string;
	address?: string;
};
