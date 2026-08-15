export type CreateDriverInput = {
	id?: string;
	name: string;
	phone?: string;
	truckNo?: string;
	licenseNo?: string;
	active?: boolean;
};

export type UpdateDriverInput = {
	name?: string;
	phone?: string;
	truckNo?: string;
	licenseNo?: string;
	active?: boolean;
};