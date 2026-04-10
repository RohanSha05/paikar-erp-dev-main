export type CreateUserInput = {
	name: string;
	email: string;
	password: string;
	role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
	active: boolean;
};

export type UpdateUserInput = {
	name?: string;
	password?: string;
	role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
	active?: boolean;
};
