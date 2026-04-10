export type CreatePartyInput = {
	name: string;
	district?: string;
	market?: string;
	phone?: string;
};

export type UpdatePartyInput = {
	name?: string;
	district?: string;
	market?: string;
	phone?: string;
};
