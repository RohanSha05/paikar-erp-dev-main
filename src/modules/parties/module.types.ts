export type CreatePartyInput = {
  name: string;
  district?: string;
  market?: string;
  phone?: string;

  nidNumber?: string;
  emergencyPhone?: string;
  address?: string;
};

export type UpdatePartyInput = {
  name?: string;
  district?: string;
  market?: string;
  phone?: string;

  nidNumber?: string;
  emergencyPhone?: string;
  address?: string;
};