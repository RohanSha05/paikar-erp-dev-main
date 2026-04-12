export type CreateDriverTripInput = {
	id?: string;
	driverId: string;
	driverName?: string;
	date: string;
	route?: string;
	truckNo?: string;
	amount: number;
	memo?: string;
	poId?: string;
	settled?: boolean;
	settledAt?: string;
};

export type UpdateDriverTripInput = {
	driverName?: string;
	date?: string;
	route?: string;
	truckNo?: string;
	amount?: number;
	memo?: string;
	poId?: string;
	settled?: boolean;
	settledAt?: string | null;
};