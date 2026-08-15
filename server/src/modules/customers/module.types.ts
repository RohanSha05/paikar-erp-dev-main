export type CreateCustomerInput = {
  name: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  type?: 'mill' | 'retailer' | 'other';
};

export type UpdateCustomerInput = {
  name?: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  type?: 'mill' | 'retailer' | 'other';
};
