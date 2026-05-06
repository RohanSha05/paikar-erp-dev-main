export type CreateCustomerInput = {
  name: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  type?: 'mill' | 'retailer' | 'other';
  nidNumber?: string;
  emergencyPhone?: string;
};

export type UpdateCustomerInput = {
  name?: string;
  address?: string;
  district?: string;
  market?: string;
  phone?: string;
  type?: 'mill' | 'retailer' | 'other';
  nidNumber?: string;
  emergencyPhone?: string;
};